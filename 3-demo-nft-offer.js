const xrpl = require('xrpl')

net = "wss://s.altnet.rippletest.net:51233"

const wallet = xrpl.Wallet.fromSecret("sEdVqxQ53SCDCQTJjciVNisKc5Z1mQU");
const wallet2 = xrpl.Wallet.fromSecret("sEdTXQBCw2kP8FSdFhxA7i49NeRREFj");

async function main() {
    const client = new xrpl.Client(net)
    await client.connect()  
    console.log(client.isConnected())

    console.log(wallet)
    console.log(wallet2)

    const nftmint = {
        TransactionType: 'NFTokenMint',
        Account: wallet.address,
        NFTokenTaxon: 0,
        Flags: xrpl.NFTokenMintFlags.tfTransferable,
        URI: xrpl.convertStringToHex("https://www.tokensa.com"),
    }

    const results = await client.submitAndWait(nftmint, {autofill : true, wallet })

    const id = results.result.meta.nftoken_id

    const createOffer = {
        TransactionType: 'NFTokenCreateOffer',
        Account: wallet2.address,
        NFTokenID: id,
        Amount: "10000",
        Owner: wallet.address,
    }

    const results2 = await client.submitAndWait(createOffer, {autofill : true, wallet : wallet2 })

    const id2 = results2.result.meta.offer_id

    console.log(id2)

    const acceptOffer = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: wallet.address,
        NFTokenBuyOffer: id2,
    }

    const results3 = await client.submit(acceptOffer, {autofill : true, wallet })

    console.log(results3)


    await client.disconnect()


}

main()