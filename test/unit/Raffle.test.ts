import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle: Raffle;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          const chainId = network.config.chainId!;
          let raffleEntranceFee: BigNumber;
          let deployer: string;
          let interval: BigNumber;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              raffle = await ethers.getContract("Raffle", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", () => {
              it("should intialize the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState();
                  const interval = await raffle.getInterval();
                  assert.equal(raffleState.toString(), "0");
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]["keepersUpdateInterval"]
                  );
              });
          });

          describe("enterRaffle", () => {
              it("should revert when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  );
              });

              it("should record players when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const playerFromContract = await raffle.getPlayer(0);
                  assert(playerFromContract, deployer);
              });

              it("should emit event on entering", async () => {
                  expect(await raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  );
              });

              it("should not allow entrance when calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  // we pretend to be a keeper for a second
                  await raffle.performUpkeep([]);
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  );
              });
          });

          describe("checkUpkeep", () => {
              it("should return false if people haven't send any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("should return false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await raffle.performUpkeep("0x");
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert.equal(raffleState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });

              it("should return false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("should return true if enough time has passed, has players, has ETH and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", () => {
              it("should only run when checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await raffle.performUpkeep("0x");
                  assert(tx);
              });

              it("should revert when checkUpkeep is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded(0, 0, 0)"
                  );
              });

              it("should change raffle state, emit event and call vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await raffle.performUpkeep("0x");
                  const txReceipt = await tx.wait();
                  const requestId = txReceipt.events![1].args!.requestId;
                  const raffleState = await raffle.getRaffleState();
                  expect(tx).to.be.emit(raffle, `RequestRaffleWinner(${requestId})`);
                  assert(raffleState.toString() === "1");
                  assert(requestId > 0);
              });
          });

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });

              it("can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("will pick a winner, reset the raffle and send the money", async () => {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1; // deployer = 0
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      raffle = raffle.connect(accounts[i]);
                      await raffle.enterRaffle({ value: raffleEntranceFee });
                  }
                  const startingTimeStamp = await raffle.getLastestTimeStamp();

                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const numOfPlayers = await raffle.getNumberOfPlayers();
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLastestTimeStamp();
                              const winnerBalance = await accounts[1].getBalance();
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner, accounts[1].address);
                              assert.equal(raffleState, 0);
                              assert.equal(numOfPlayers.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
                                      .add(raffleEntranceFee.mul(additionalEntrants)) // 3 players
                                      .add(raffleEntranceFee) // deployer
                                      .toString()
                              );
                              resolve();
                              //   console.log("waiting....");
                          } catch (error) {
                              reject(error);
                          }
                      });

                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const requestId = txReceipt.events![1].args!.requestId;
                      const startingBalance = await accounts[1].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
                  });
              });
          });
      });
