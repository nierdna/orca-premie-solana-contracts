/**
 * Ví dụ đơn giản: Tạo Token Market từ Server
 * Chỉ focus vào createTokenMarket operation
 */

import {
    OrcaSDK,
    KeypairWallet,
    createTokenMarket
} from '../index';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

async function createTokenMarketExample() {
    console.log('🚀 Creating token market...');

    // 1. Tạo SDK instance
    const sdk = OrcaSDK.create({
        network: 'devnet',
    });

    // 2. Đọc admin keypair từ file deployer.json
    const deployerPath = path.join(os.homedir(), '.config', 'solana', 'deployer.json');
    const secretKey = JSON.parse(fs.readFileSync(deployerPath, 'utf8'));
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    const adminWallet = new KeypairWallet(adminKeypair);

    console.log('Admin PublicKey:', adminKeypair.publicKey.toString());

    try {
        // 3. Tạo token market
        const tokenMarketResult = await createTokenMarket(
            sdk.trading,                    // TradingClient instance
            { wallet: adminWallet },        // OperationContext
            {
                symbol: 'ORCA',                    // Token symbol
                name: 'Orca Token Pre-Market',     // Token name  
                settleTimeLimit: 86400,           // 24 hours in seconds
            }
        );

        // 4. Hiển thị kết quả
        console.log('✅ Token market created successfully!');
        console.log('Transaction:', tokenMarketResult.signature);
        console.log('Token Market Address:', tokenMarketResult.tokenMarket.toString());
        console.log('Symbol:', tokenMarketResult.symbol);
        console.log('Name:', tokenMarketResult.name);

        return tokenMarketResult;

    } catch (error) {
        console.error('❌ Failed to create token market:', error);
        throw error;
    }
}

// Export function
export { createTokenMarketExample };

// Run if called directly
if (require.main === module) {
    createTokenMarketExample()
        .then(() => console.log('🎉 Done!'))
        .catch(console.error);
} 