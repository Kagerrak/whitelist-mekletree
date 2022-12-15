const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

function encodeLeaf(address, spots) {
  // same as abi.encodePacked in solodity
  return ethers.utils.defaultAbiCoder.encode(
    ["address", "uint64"],
    [address, spots]
  );
}

describe("Check if merkle root is working", () => {
  it("Should be able to verify if a given address is in whitelist or not", async () => {
    // Get a bunch of test addresses
    const [owner, addr1, addr2, addr3, addr4, addr5] =
      await ethers.getSigners();

    // Create an array of elements you wish to encode in the Merkle Tree
    const list = [
      encodeLeaf(owner.address, 2),
      encodeLeaf(addr1.address, 2),
      encodeLeaf(addr2.address, 2),
      encodeLeaf(addr3.address, 2),
      encodeLeaf(addr4.address, 2),
      encodeLeaf(addr5.address, 2),
    ];

    // Create the Merkle Tree using the hashing algorith `keccak256`
    // Make sure to sort the tree so that i can be produced deterministically regardless
    // of the order the input list
    const merkleTree = new MerkleTree(list, keccak256, {
      hashLeaves: true,
      sortPairs: true,
    });
    // Compute the Merkle Root
    const root = merkleTree.getHexRoot();

    // Deploy the Whitelist contract
    const whitelist = await ethers.getContractFactory("WhiteList");
    const Whitelist = await whitelist.deploy(root);
    await Whitelist.deployed();

    // Compute the Merkle Proof of the owner address (0'th item in list)
    // off-chain. The leaf node is the hash of that value.
    const leaf = keccak256(list[0]);
    const proof = merkleTree.getHexProof(leaf);

    // Provide the Merkle Proof to the contract, and ensure that it can verify
    // that this leaf nodes was indeed part of the Merkle Tree
    let verified = await Whitelist.checkInWhiteList(proof, 2);
    expect(verified).to.equal(true);

    // Provide an invalid Merkle Proof to the contract, and ensure that
    // it can verify that this leaf node was NOT patt of the MErkle Tree
    verified = await Whitelist.checkInWhiteList([], 2);
    expect(verified).to.equal(false);
  });
});
