import { Provider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";

export class ClientProvider implements Provider {
    connection: Connection;
    constructor(connection: Connection) {
        this.connection = connection;
    }
}