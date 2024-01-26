const xrpl = require('xrpl')

net = "wss://s.altnet.rippletest.net:51233"


async function main() {
    const client = new xrpl.Client(net)
    await client.connect()  
    console.log(client.isConnected())

    const { wallet } = await client.fundWallet()
    console.log(wallet)

    console.log(await client.getBalances(wallet.address))
    const {wallet: wallet2} = await client.fundWallet()

    const payment = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination:"r9BdmMa6C8didiDAugvBvMBZ27iZZcDFJi",
        Amount: xrpl.xrpToDrops(30000000)
    }

    //Technique 1
    //const result = await client.submit(payment, {autofill : true, wallet })

    //Technique 2
    const prepared = await client.autofill(payment)
    const signed = wallet.sign(prepared)
    const results = await client.submitAndWait(signed.tx_blob)

    console.log(results)






    await client.disconnect()  
}

main()