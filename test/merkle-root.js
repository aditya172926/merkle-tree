const {expect} = require("chai");
const keccak256 = require("keccak256");
const {MerkleTree} = require("merkletreejs");

function encodeLeaf(address, spots) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint64"], // datatypes of arguements to encode
        [address, spots] // actual values
    )
}

describe("Merkle Trees", function() {
    it("Should be able to verify if an address is in a whilelist or not",
        async function() {
            // get test addresses
            const testAddresses = await ethers.getSigners();

            // create an array of ABI encoded elements to put in the merkle tree
            const list = [
                encodeLeaf(testAddresses[0].address, 2),
                encodeLeaf(testAddresses[1].address, 2),
                encodeLeaf(testAddresses[2].address, 2),
                encodeLeaf(testAddresses[3].address, 2),
                encodeLeaf(testAddresses[4].address, 2),
                encodeLeaf(testAddresses[5].address, 2)
            ]

            // using keccak256 as the hashing algorithm, create a merkle tree
            const merkleTree = new MerkleTree(list, keccak256, {
                hashLeaves: true, // hash each leaf using keccak256 to make them fixed size
                sortPairs: true, // sort the tree for deterministic output
                sortLeaves: true
            });

            // compute the merkle root in hexadecimal
            const root = merkleTree.getHexRoot();

            // deploy the whitelist contract
            const whiteList = await ethers.getContractFactory("Whitelist");
            const Whitelist = await whiteList.deploy(root);
            await Whitelist.waitForDeployment();

            // check for valid address
            for (let i=0; i<6; i++) {
                // compute the Merkle Proof for testAddress[i]
                const leaf = keccak256(list[i]); // hash of the leaf node
                const proof = merkleTree.getHexProof(leaf); // get the Merkle Proof

                // connect the testAddress[i] to contract
                const connectedWhitelist = await Whitelist.connect(testAddresses[i]);

                /* verify that contract can confirm the presence of this address in the 
                Merkle tree using just the Root provided to it.
                Giving it the Merkle proof and the original values it calculates the address
                using msg.sender and we provide the number of NFTs.
                */
               const verified = await connectedWhitelist.checkInWhitelist(proof, 2);
               expect(verified).to.equal(true);
            }

            // check for invalid address
            const verifiedInvalid = await Whitelist.checkInWhitelist([], 2);
            expect(verifiedInvalid).to.equal(false);
        }
    )
})