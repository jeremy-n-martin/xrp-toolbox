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
        TransactionType: 'NFTokenMint',
        Account: wallet.address,
        NFTokenTaxon: 0,
        Flags: xrpl.NFTokenMintFlags.tfTransferable,
        URI: xrpl.convertStringToHex("https://www.tokensa.com"),
    }


    const prepared = await client.autofill(payment)
    const signed = wallet.sign(prepared)
    const results = await client.submitAndWait(signed.tx_blob)

    console.log(results)






    await client.disconnect()  
}

main()