import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = ethers.utils.parseEther("0.25"); // 0.25 is the premium. It costs 0.25 LINK per request
const GAS_PRICE_LINK = 1e9; // link per gas. Calculated value based on the chain.

// ETH price up to $1,000,000,000
// Chainlink Nodes pay the gas fees to give us randomness & do external execution
// So the price of requests change based on the price of gas

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args: any[] = [BASE_FEE, GAS_PRICE_LINK];

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        });
        log("Mocks deploy!");
        log("-----------------------------------------");
    }
};

deployMocks.tags = ["all", "mocks"];

export default deployMocks;
