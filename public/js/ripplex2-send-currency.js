// *******************************************************
// **************** Configure Account ********************
// *******************************************************
    
// Button "configure account" calls this function with the parameter "standby" or "operational"
// to configure the account. The defaultRippleSetting is false by defaut (rippling fobidden)
async function configureAccount(type, defaultRippleSetting) {

  // Connect to the ledger
  let net = getNet()
  let resultField = 'standbyResultField'
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + net + '....'
  await client.connect()
  results += '\nConnected, finding wallet.'

  // Get the account wallets
  if (type=='standby') {
    my_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  } else {
    my_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)
    resultField = 'operationalResultField'
  }
  results += '\nRipple Default Setting: ' + defaultRippleSetting
  resultField.value = results

  // Prepare the transaction. If the defaultRippleSetting is true, set the asfDefaultRipple flag.
  // "false" means rippling fobidden : the currency transferred from one account CAN ONLY be transferred back to the same account.
  // To enable currency transfer to third parties, you need to set the rippleDefault value to true
  let settings_tx = {}
  if (defaultRippleSetting) {
    settings_tx = {
      "TransactionType": "AccountSet",
      "Account": my_wallet.address,
      "SetFlag": xrpl.AccountSetAsfFlags.asfDefaultRipple
    } 
    results += '\n Set Default Ripple flag.' 
    } else {
      settings_tx = {
      "TransactionType": "AccountSet",
      "Account": my_wallet.address,
      "ClearFlag": xrpl.AccountSetAsfFlags.asfDefaultRipple
    }
    results += '\n Clear Default Ripple flag.' 
  }
  results += '\nSending account setting.'   
  resultField.value = results

  // Auto-fill the default values for the transaction, sign it, submit it, wait and report the result.
  const prepared = await client.autofill(settings_tx)
  const signed = my_wallet.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  if (result.result.meta.TransactionResult == "tesSUCCESS") {
    results += '\nAccount setting succeeded.'
    document.getElementById(resultField).value = results
  } else {
    throw 'Error sending transaction: ${result}'
    results += '\nAccount setting failed.'
    resultField.value = results
  }     
  client.disconnect()
} // End of configureAccount()
      
// *******************************************************
// ***************** Create TrustLine ********************
// *******************************************************
      
async function createTrustline() {
  let net = getNet()
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + getNet() + '....'
  standbyResultField.value = results

  await client.connect()
  results += '\nConnected.'
  standbyResultField.value = results
          
  const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  const operational_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)
  const currency_code = standbyCurrencyField.value
  const trustSet_tx = {
    "TransactionType": "TrustSet",
    "Account": standbyDestinationField.value,
    "LimitAmount": {
      "currency": standbyCurrencyField.value,
      "issuer": standby_wallet.address,
      "value": standbyAmountField.value
    }
  }
  const ts_prepared = await client.autofill(trustSet_tx)
  const ts_signed = operational_wallet.sign(ts_prepared)
  results += '\nCreating trust line from operational account to standby account...'
  standbyResultField.value = results
  const ts_result = await client.submitAndWait(ts_signed.tx_blob)
  if (ts_result.result.meta.TransactionResult == "tesSUCCESS") {
    results += '\nTrustline established between account \n' +
      standbyDestinationField.value + ' \n and account\n' + standby_wallet.address + '.'
    standbyResultField.value = results
  } else {
    results += '\nTrustLine failed. See JavaScript console for details.'
    document.getElementById('standbyResultField').value = results     
    throw 'Error sending transaction: ${ts_result.result.meta.TransactionResult}'
  }
} //End of createTrustline()
      
// *******************************************************
// *************** Send Issued Currency ******************
// *******************************************************
      
async function sendCurrency() {
  let net = getNet()
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + getNet() + '....'
  document.getElementById('standbyResultField').value = results

  await client.connect()

  results += '\nConnected.'
  standbyResultField.value = results
          
  const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  const operational_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)
  const currency_code = standbyCurrencyField.value
  const issue_quantity = standbyAmountField.value
        
  const send_token_tx = {
    "TransactionType": "Payment",
    "Account": standby_wallet.address,
    "Amount": {
      "currency": standbyCurrencyField.value,
      "value": standbyAmountField.value,
      "issuer": standby_wallet.address
    },
    "Destination": standbyDestinationField.value
  }
      
  const pay_prepared = await client.autofill(send_token_tx)
  const pay_signed = standby_wallet.sign(pay_prepared)
  results += 'Sending ${issue_quantity} ${currency_code} to ' +
    standbyDestinationField.value + '...'
  standbyResultField.value = results
  const pay_result = await client.submitAndWait(pay_signed.tx_blob)
  if (pay_result.result.meta.TransactionResult == "tesSUCCESS") {
    results += 'Transaction succeeded: https://testnet.xrpl.org/transactions/${pay_signed.hash}'
    standbyResultField.value = results
  } else {
    results += 'Transaction failed: See JavaScript console for details.'
    standbyResultField.value = results
    throw 'Error sending transaction: ${pay_result.result.meta.TransactionResult}'
  }
  standbyBalanceField.value = (await client.getXrpBalance(standby_wallet.address))
  operationalBalanceField.value = (await client.getXrpBalance(operational_wallet.address))
  getBalances()
  client.disconnect()
} // end of sendCurrency()
      
// *******************************************************
// ****************** Get Balances ***********************
// *******************************************************

async function getBalances() {
  let net = getNet()
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + getNet() + '....'
  standbyResultField.value = results
  await client.connect()   
  results += '\nConnected.'
  standbyResultField.value = results

  const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  const operational_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)   
  results= "\nGetting standby account balances...\n"
  const standby_balances = await client.request({
    command: "gateway_balances",
    account: standby_wallet.address,
    ledger_index: "validated",
    hotwallet: [operational_wallet.address]
  })
  results += JSON.stringify(standby_balances.result, null, 2)
  standbyResultField.value = results
      
  results += "\nGetting operational account balances...\n"
  const operational_balances = await client.request({
    command: "gateway_balances",
    account: operational_wallet.address,
    ledger_index: "validated"
  })
  results += JSON.stringify(operational_balances.result, null, 2)
  operationalResultField.value = results
  operationalBalanceField.value = (await client.getXrpBalance(operational_wallet.address))
  standbyResultField.value = results
  standbyBalanceField.value = (await client.getXrpBalance(standby_wallet.address))

  client.disconnect()
} // End of getBalances()
            
// **********************************************************************
// ****** Reciprocal Transactions ***************************************
// **********************************************************************
      
// *******************************************************
// ************ Create Operational TrustLine *************
// *******************************************************
      
async function oPcreateTrustline() {
  let net = getNet()
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + getNet() + '....'
  operationalResultField.value = results
        
  await client.connect()
  results += '\nConnected.'
  operationalResultField.value = results
          
  const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  const operational_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)
  const trustSet_tx = {
    "TransactionType": "TrustSet",
    "Account": operationalDestinationField.value,
    "LimitAmount": {
      "currency": operationalCurrencyField.value,
      "issuer": operational_wallet.address,
      "value": operationalAmountField.value
    }
  }
  const ts_prepared = await client.autofill(trustSet_tx)
  const ts_signed = standby_wallet.sign(ts_prepared)
  results += '\nCreating trust line from operational account to ' +
   operationalDestinationField.value + ' account...'
  operationalResultField.value = results
  const ts_result = await client.submitAndWait(ts_signed.tx_blob)
  if (ts_result.result.meta.TransactionResult == "tesSUCCESS") {
    results += '\nTrustline established between account \n' + operational_wallet.address +
      ' \n and account\n' + operationalDestinationField.value + '.'
    operationalResultField.value = results
  } else {
    results += '\nTrustLine failed. See JavaScript console for details.'
    operationalResultField.value = results     
    throw 'Error sending transaction: ${ts_result.result.meta.TransactionResult}'
  }
} //End of oP createTrustline
      
// *******************************************************
// ************* Operational Send Issued Currency ********
// *******************************************************
      
async function oPsendCurrency() {
  let net = getNet()
  const client = new xrpl.Client(net)
  results = 'Connecting to ' + getNet() + '....'
  operationalResultField.value = results
        
  await client.connect()        
  results += '\nConnected.'
  operationalResultField.value = results
          
  const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.value)
  const operational_wallet = xrpl.Wallet.fromSeed(operationalSeedField.value)
  const currency_code = operationalCurrencyField.value
  const issue_quantity = operationalAmountField.value
        
  const send_token_tx = {
    "TransactionType": "Payment",
    "Account": operational_wallet.address,
    "Amount": {
      "currency": currency_code,
      "value": issue_quantity,
      "issuer": operational_wallet.address
    },
    "Destination": operationalDestinationField.value
  }
      
  const pay_prepared = await client.autofill(send_token_tx)
  const pay_signed = operational_wallet.sign(pay_prepared)
  results += 'Sending ${issue_quantity} ${currency_code} to ' +
    operationalDestinationField.value + '...'
  operationalResultField.value = results
  const pay_result = await client.submitAndWait(pay_signed.tx_blob)
  if (pay_result.result.meta.TransactionResult == "tesSUCCESS") {
    results += 'Transaction succeeded: https://testnet.xrpl.org/transactions/${pay_signed.hash}'
    operationalResultField.value = results
  } else {
    results += 'Transaction failed: See JavaScript console for details.'
    operationalResultField.value = results
    throw 'Error sending transaction: ${pay_result.result.meta.TransactionResult}'
  }
  standbyBalanceField.value = (await client.getXrpBalance(standby_wallet.address))
  operationalBalanceField.value = (await client.getXrpBalance(operational_wallet.address))
  getBalances()
  client.disconnect()
} // end of oPsendCurrency()
    