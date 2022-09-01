import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";
import { frontEndAbiFile, frontEndAddressContractFile } from "../helper-hardhat-config";

const updateUI: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updaing Front End...");
        await updateAddressContract(hre);
        await updateAbi(hre);
        console.log("Updated Successfully!");
    }
};

async function updateAddressContract(hre: HardhatRuntimeEnvironment) {
    const { ethers, network } = hre;
    const chainId = network.config.chainId?.toString() || "31337";
    const raffle = await ethers.getContract("Raffle");
    const contractAddress = JSON.parse(fs.readFileSync(frontEndAddressContractFile, "utf-8"));
    if (chainId in contractAddress) {
        if (!contractAddress[chainId].includes(raffle.address)) {
            contractAddress[chainId].push(raffle.address);
        }
    } else {
        contractAddress[chainId] = [raffle.address];
    }
    fs.writeFileSync(frontEndAddressContractFile, JSON.stringify(contractAddress));
}

async function updateAbi(hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(
        frontEndAbiFile,
        raffle.interface.format(ethers.utils.FormatTypes.json).toString()
    );
}

updateUI.tags = ["all", "frontend"];

export default updateUI;
