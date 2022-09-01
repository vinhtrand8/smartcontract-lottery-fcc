import { ethers } from "hardhat";
import { Address, DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config";
import verify from "../utils/verify"

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;
    let vrfCoordinatorV2Address: Address;
    let subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        );
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

        const transactionReponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionReponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]!;
        subscriptionId = networkConfig[chainId]["subscriptionId"]!;
    }

    const entranceFee = networkConfig[chainId]["raffleEntranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["keepersUpdateInterval"];
    const args: any[] = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        interval,
        entranceFee,
        callbackGasLimit,
    ];

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });

    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verify...")
        await verify(raffle.address, args);
    }
    log("---------------------------------");

};

deployRaffle.tags = ["all", "raffle"]

export default deployRaffle;


