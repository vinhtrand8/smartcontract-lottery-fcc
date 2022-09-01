import { ethers } from "ethers";
import { Address } from "hardhat-deploy/dist/types";

export interface networkConfigItem {
    name?: string;
    subscriptionId?: string;
    gasLane?: string;
    keepersUpdateInterval?: string;
    raffleEntranceFee?: string;
    callbackGasLimit?: string;
    vrfCoordinatorV2?: Address;
}

export interface newworkConfigInfo {
    [key: number]: networkConfigItem;
}

export const networkConfig: newworkConfigInfo = {
    31337: {
        name: "localhost",
        raffleEntranceFee: ethers.utils.parseEther("0.01").toString(),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000", // 500,000
        keepersUpdateInterval: "30",
    },

    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        raffleEntranceFee: ethers.utils.parseEther("0.01").toString(),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "20529",
        callbackGasLimit: "500000", // 500,000
        keepersUpdateInterval: "30",
    },
};

export const developmentChains = ["hardhat", "localhost"];

export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

export const frontEndAddressContractFile =
    "../nextjs-smartcontract-lottery/constants/contractAddress.json";

export const frontEndAbiFile = "../nextjs-smartcontract-lottery/constants/abi.json";
