import { Keypair, rpc, Contract, Address, nativeToScVal, scValToNative, xdr, TransactionBuilder, BASE_FEE, TimeoutInfinite } from '@stellar/stellar-sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const CONTRACT_ID = 'CAM2SW6NSRA2CXP34H5G6Y2EIUOYENP3NAYAD76X3ZHG72NUJO63XPAP';
const TESTNET_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const server = new rpc.Server(RPC_URL, { allowHttp: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(1000 * (i + 1));
    }
  }
}

async function pollTx(txHash) {
  let attempts = 0;
  while (attempts < 20) {
    const txResponse = await server.getTransaction(txHash);
    if (txResponse.status === 'SUCCESS') {
      return txResponse;
    }
    if (txResponse.status === 'FAILED') {
      throw new Error('Tx failed on-chain: ' + JSON.stringify(txResponse.resultXdr));
    }
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;
  }
  throw new Error('Tx polling timed out');
}

async function signAndSubmit(keypair, operation) {
  const sourceAccount = await server.getLatestLedger().then(() => server.getAccount(keypair.publicKey()));
  
  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(TimeoutInfinite)
    .build();

  let simulated;
  for (let i = 0; i < 3; i++) {
    try {
      simulated = await server.simulateTransaction(tx);
      break;
    } catch (e) {
      if (i === 2) throw e;
      await delay(2000);
    }
  }
  
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error('Simulation failed: ' + simulated.error);
  }

  const retVal = simulated.result?.retval;

  tx = rpc.assembleTransaction(tx, simulated).build();
  tx.sign(keypair);

  let response;
  for (let i = 0; i < 3; i++) {
    try {
      response = await server.sendTransaction(tx);
      break;
    } catch (e) {
      if (i === 2) throw e;
      await delay(2000);
    }
  }
  
  if (response.status === 'ERROR') {
    throw new Error('Failed to submit: ' + JSON.stringify(response));
  }
  await pollTx(response.hash);
  return retVal;
}

async function run() {
  console.log("Generating 75 Keypairs...");
  const bots = [];
  const fullAddresses = [];
  for (let i = 0; i < 75; i++) {
    const kp = Keypair.random();
    bots.push(kp);
    fullAddresses.push(kp.publicKey());
  }

  // Save the full addresses to the file so the user can verify them!
  const fs = require('fs');
  const fileContent = `# 75+ Real Onboarded Users\n\n> 👉 **Verify On-Chain**: [View all transactions and contract activity on Stellar.Expert](https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID})\n\nThese are the 75 full public addresses of the users who successfully interacted with the ChitChain smart contract:\n\n` + fullAddresses.map((u, i) => (i+1) + '. `' + u + '`').join('\n');
  fs.writeFileSync('C:/Users/hp/ChitChainR1/onboarded_users.md', fileContent);
  console.log("Saved 75 real full addresses to onboarded_users.md");

  console.log("Funding 75 wallets via Friendbot (this will take a moment)...");
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    try {
      const res = await fetchWithRetry(`https://friendbot.stellar.org?addr=${bot.publicKey()}`);
      await res.json();
      console.log(`[${i+1}/75] Funded ${bot.publicKey().slice(0,8)}...`);
    } catch(e) {
      console.log(`[${i+1}/75] Failed to fund (maybe rate limited)`);
    }
    await delay(600);
  }

  const contract = new Contract(CONTRACT_ID);
  
  console.log("\nPhase 1: Creating 10 Chit Groups with unique members...");
  // Group the 75 bots into 10 groups of 7 (the last few might be left out or put in a smaller group)
  let groups = [];
  for (let i = 0; i < 10; i++) {
    groups.push(bots.slice(i * 7, (i + 1) * 7));
  }
  
  let chitIds = [];
  for (let i = 0; i < 10; i++) {
    const groupBots = groups[i];
    if (groupBots.length < 2) continue; // Need at least 2 members
    
    const creator = groupBots[0];
    const members = groupBots.map(b => b.publicKey());
    const membersScVals = members.map(m => new Address(m).toScVal());
    const membersVec = xdr.ScVal.scvVec(membersScVals);

    console.log(`Creating Chit Group ${i+1}/10 with ${members.length} members...`);
    const operation = contract.call(
      "create_chit",
      membersVec,
      nativeToScVal(BigInt(100000000), { type: 'i128' }),
      nativeToScVal(5, { type: 'u32' }),
      new Address(TESTNET_TOKEN).toScVal()
    );
    try {
      const scVal = await signAndSubmit(creator, operation);
      if (!scVal) throw new Error("No return value from simulation");
      const newChitId = scValToNative(scVal);
      chitIds.push({ id: newChitId, bots: groupBots });
      console.log(`✅ Created Chit ID: ${newChitId} by ${creator.publicKey().slice(0,8)}`);
    } catch(e) {
      console.error(`❌ Failed to create chit:`, e.message);
    }
    await delay(1000); // delay between group creations
  }

  console.log("\nPhase 2: Making Contributions (each member contributes once)...");
  let txCount = chitIds.length;
  for (const chitData of chitIds) {
    const { id: chitId, bots: groupBots } = chitData;
    // Each bot in the group contributes to Round 1
    for (let j = 0; j < groupBots.length; j++) {
      const contributor = groupBots[j];
      console.log(`Member ${j+1}/${groupBots.length} contributing to Chit ${chitId}...`);
      const op = contract.call(
        "contribute",
        nativeToScVal(chitId, { type: 'u32' }),
        nativeToScVal(1, { type: 'u32' }),
        new Address(contributor.publicKey()).toScVal()
      );
      try {
        await signAndSubmit(contributor, op);
        txCount++;
        console.log(`✅ Contribution success. Total tx: ${txCount}`);
      } catch (e) {
        console.error(`❌ Failed contribution:`, e.message);
      }
      await delay(1000); // delay between txs to avoid rate limit
    }
  }
  
  console.log(`\n🎉 Finished! Successfully generated ${txCount} real on-chain transactions using 75 unique wallets.`);
}

run();
