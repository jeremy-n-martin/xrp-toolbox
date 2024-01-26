const xrpl = require('xrpl')

net = "wss://s.altnet.rippletest.net:51233"

const issuer = xrpl.Wallet.fromSecret("sEdVqxQ53SCDCQTJjciVNisKc5Z1mQU");
const holder = xrpl.Wallet.fromSecret("sEdTXQBCw2kP8FSdFhxA7i49NeRREFj");

async function main() {
    const client = new xrpl.Client(net)
    await client.connect()  
    console.log(client.isConnected())

    console.log(issuer)
    console.log(holder)

    const trustTx = {
        TransactionType: 'TrustSet',
        Account: holder.address,
        LimitAmount: {  
            currency: 'BOB',
            issuer: issuer.address,
            value: '10000',
        }
    }


    const result1 = await client.submitAndWait(trustTx, {autofill : true, wallet : holder })

    console.log(result1)

    const paymentTx = {
        TransactionType: 'Payment',
        Account: issuer.address,
        Destination: holder.address,
        Amount: {
            currency: 'BOB',
            issuer: issuer.address,
            value: '100',
        }
    }   

    const result2 = await client.submitAndWait(trustTx, {autofill : true, wallet : issuer })

    console.log(result2)


    await client.disconnect()


}

main()