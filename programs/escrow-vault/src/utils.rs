use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::{self, load_instruction_at_checked};
use solana_program::pubkey;
use crate::error::VaultError;

/// 🔍 Shared utility to extract caller program ID from instruction sysvar
/// This is the most accurate way to detect CPI caller in Solana
/// Handles system programs (ComputeBudget, System, etc.) by skipping them
pub fn get_cpi_caller_program_id(instruction_sysvar: &AccountInfo) -> Result<Pubkey> {
    let system_programs = [
        solana_program::system_program::ID,
        pubkey!("ComputeBudget111111111111111111111111111111"),
        anchor_lang::solana_program::sysvar::ID,
    ];
    
    // Get current instruction index
    let current_index = instructions::load_current_index_checked(instruction_sysvar)
        .map_err(|_| VaultError::FailedToLoadInstruction)?;
    msg!("Current instruction index: {}", current_index);
    
    // Search ALL previous instructions (0 to current_index-1)
    // But also try to search beyond current_index if needed
    for i in (0..=current_index + 1).rev() { // ✅ FIXED: search more broadly
        msg!("Checking instruction at index {}", i);
        if let Ok(instruction) = load_instruction_at_checked(i as usize, instruction_sysvar) {
            msg!("Instruction program ID: {}", instruction.program_id);
            if !system_programs.contains(&instruction.program_id) {
                msg!("Found caller program at index {}: {}", i, instruction.program_id);
                return Ok(instruction.program_id);
            } else {
                msg!("Skipping system program at index {}: {}", i, instruction.program_id);
            }
        } else {
            msg!("Failed to load instruction at index {}", i);
        }
    }
    
    Err(VaultError::FailedToLoadInstruction.into())
}