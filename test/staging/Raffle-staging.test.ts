import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { Raffle } from "../../typechain-types";

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Test", () => {
          let raffle: Raffle;
          let raffleEntranceFee: BigNumber;
          let deployer: string;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, and gets a random winner", async () => {
                  // enter the raffle
                  console.log("Setting up test...");
                  const startingTimeStamp = await raffle.getLastestTimeStamp();
                  const accounts = await ethers.getSigners();

                  console.log("Setting up listener...");
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              console.log("WinnerPicked event fired!");
                              const recentWinner = await raffle.getRecentWinner();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLastestTimeStamp();
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(raffleState, 0);
                              assert.equal(recentWinner.toString(), accounts[0].address.toString());
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      console.log("Entering the raffle");
                      let winnerStartingBalance: BigNumber;
                      try {
                          const tx = await raffle.enterRaffle({
                              value: raffleEntranceFee,
                              // Uncomment line below if get error can not estimate
                              // gasLimit: 2e7,
                          });
                          const txReceipt = await tx.wait(1);
                          const { gasUsed, effectiveGasPrice } = txReceipt;
                          console.log(gasUsed.toNumber(), effectiveGasPrice.toNumber());
                          console.log("Receipt passed");
                          winnerStartingBalance = await accounts[0].getBalance();
                      } catch (error) {
                          console.log(error);
                      }
                      console.log("Waiting the winner @@");
                  });
              });
          });
      });
