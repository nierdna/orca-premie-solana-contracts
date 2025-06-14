use anchor_lang::prelude::*;

// ✅ Khai báo program ID
declare_id!("11111111111111111111111111111112");

#[program]
pub mod user_profile {
    use super::*;

    /// # Instruction: initialize_profile
    /// Initializes user profile with PDA
    /// Accounts:
    /// - [signer] user: User authority
    /// - [writable] profile: User profile PDA account
    /// - system_program: System program for account creation
    pub fn initialize_profile(
        ctx: Context<InitializeProfile>,
        name: String,
    ) -> Result<()> {
        // ✅ Log PDA cho debug
        msg!("Initializing profile for user: {}", ctx.accounts.user.key());
        msg!("Profile PDA: {}", ctx.accounts.profile.key());

        // ✅ Validate input
        require!(name.len() <= 32, UserProfileError::NameTooLong);
        require!(!name.is_empty(), UserProfileError::NameEmpty);

        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.user.key();
        profile.name = name;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.version = 1; // ✅ Version cho migration
        profile.bump = ctx.bumps.profile; // ✅ Store bump

        msg!("Profile initialized successfully");
        Ok(())
    }

    /// # Instruction: update_profile
    /// Updates user profile data
    /// Accounts:
    /// - [signer] user: User authority (must match profile authority)
    /// - [writable] profile: User profile PDA account
    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        new_name: String,
    ) -> Result<()> {
        msg!("Updating profile: {}", ctx.accounts.profile.key());

        // ✅ Validate input
        require!(new_name.len() <= 32, UserProfileError::NameTooLong);
        require!(!new_name.is_empty(), UserProfileError::NameEmpty);

        let profile = &mut ctx.accounts.profile;
        profile.name = new_name;
        profile.updated_at = Some(Clock::get()?.unix_timestamp);

        msg!("Profile updated successfully");
        Ok(())
    }

    /// # Instruction: close_profile
    /// Closes user profile and returns rent
    /// Accounts:
    /// - [signer] user: User authority
    /// - [writable] profile: User profile PDA account
    pub fn close_profile(ctx: Context<CloseProfile>) -> Result<()> {
        msg!("Closing profile: {}", ctx.accounts.profile.key());
        Ok(())
    }
}

// ✅ Account validation structs
#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.authority == user.key() @ UserProfileError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseProfile<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.authority == user.key() @ UserProfileError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

// ✅ State account với proper space calculation
#[account]
pub struct UserProfile {
    pub authority: Pubkey,      // 32
    pub name: String,           // 4 + 32
    pub created_at: i64,        // 8
    pub updated_at: Option<i64>, // 1 + 8
    pub version: u8,            // 1
    pub bump: u8,               // 1
}

impl UserProfile {
    const INIT_SPACE: usize = 8 + 32 + 4 + 32 + 8 + 1 + 8 + 1 + 1;
}

// ✅ Custom error handling
#[error_code]
pub enum UserProfileError {
    #[msg("Name is too long. Maximum 32 characters allowed.")]
    NameTooLong,
    
    #[msg("Name cannot be empty.")]
    NameEmpty,
    
    #[msg("Unauthorized: You are not the authority of this profile.")]
    Unauthorized,
} 