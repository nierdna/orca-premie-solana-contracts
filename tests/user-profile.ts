import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { UserProfile } from "../target/types/user_profile";
import { PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";

describe("user-profile", () => {
  // ✅ Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.UserProfile as Program<UserProfile>;
  
  // ✅ Test với nhiều user khác nhau
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();

  before(async () => {
    // ✅ Airdrop SOL cho test users
    const connection = anchor.getProvider().connection;
    await connection.requestAirdrop(user1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(user3.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it("Should initialize user profile with PDA", async () => {
    const name = "Alice";
    
    // ✅ Calculate PDA offline - theo section 11
    const [profilePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );
    
    console.log("User1:", user1.publicKey.toString());
    console.log("Profile PDA:", profilePda.toString());
    console.log("Bump:", bump);

    await program.methods
      .initializeProfile(name)
      .accounts({
        profile: profilePda,
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // ✅ Verify account data
    const profileAccount = await program.account.userProfile.fetch(profilePda);
    expect(profileAccount.authority.toString()).to.equal(user1.publicKey.toString());
    expect(profileAccount.name).to.equal(name);
    expect(profileAccount.version).to.equal(1);
    expect(profileAccount.bump).to.equal(bump);
    expect(profileAccount.createdAt.toNumber()).to.be.greaterThan(0);
  });

  it("Should update user profile", async () => {
    const newName = "Alice Updated";
    
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateProfile(newName)
      .accounts({
        profile: profilePda,
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const profileAccount = await program.account.userProfile.fetch(profilePda);
    expect(profileAccount.name).to.equal(newName);
    expect(profileAccount.updatedAt).to.not.be.null;
  });

  it("Should fail when unauthorized user tries to update", async () => {
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .updateProfile("Hacker Name")
        .accounts({
          profile: profilePda,
          user: user2.publicKey, // ✅ Different user - should fail
        })
        .signers([user2])
        .rpc();
      
      expect.fail("Should have failed with unauthorized error");
    } catch (error) {
      // ✅ Fix: Check for both possible error messages
      const errorStr = error.toString();
      const hasUnauthorized = errorStr.includes("Unauthorized") || 
                             errorStr.includes("A raw constraint was violated") ||
                             errorStr.includes("constraint");
      expect(hasUnauthorized).to.be.true;
    }
  });

  it("Should fail with name too long", async () => {
    const longName = "A".repeat(50); // > 32 characters
    
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProfile(longName)
        .accounts({
          profile: profilePda,
          user: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();
      
      expect.fail("Should have failed with name too long error");
    } catch (error) {
      expect(error.toString()).to.include("Name is too long");
    }
  });

  it("Should fail with empty name", async () => {
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user3.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProfile("")
        .accounts({
          profile: profilePda,
          user: user3.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user3])
        .rpc();
      
      expect.fail("Should have failed with empty name error");
    } catch (error) {
      expect(error.toString()).to.include("Name cannot be empty");
    }
  });

  it("Should close profile and return rent", async () => {
    const name = "Bob";
    
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    // First initialize
    await program.methods
      .initializeProfile(name)
      .accounts({
        profile: profilePda,
        user: user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Then close
    await program.methods
      .closeProfile()
      .accounts({
        profile: profilePda,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    // ✅ Verify account is closed
    try {
      await program.account.userProfile.fetch(profilePda);
      expect.fail("Account should be closed");
    } catch (error) {
      expect(error.toString()).to.include("Account does not exist");
    }
  });
}); 