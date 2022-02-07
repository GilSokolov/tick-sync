
function convertSymbolMessage(msg) {
    return msg.split(',').reduce((obj, str) => {
        const [key, value] = str.split('|');
        obj[key] = Number(value)||value;
        return obj;
    }, {});
}

function formatSymbol(symbol) {
    const dateTime = symbol.dateTime.replace(/\./g, '-');

    return {
        ...symbol,
        dateTime
    }
}


function test() {
    const msgTest = 'symbol|SPX500.,bid|4482.25,ask|4484.00,low|4470.50,high|4503.50,spread|175,dateTime|2022.02.07 13:16:56';
    const expected = {
        symbol: 'SPX500.',
        bid: 4482.25,
        ask: 4484,
        low: 4470.5,
        high: 4503.5,
        spread: 175,
        dateTime: '2022.02.07 13:16:56'
    }

    const testStr = convertSymbolMessage(msgTest);

    const tested = JSON.stringify(expected) === JSON.stringify(testStr);

    if (tested) {
        console.log('works:', testStr);
    } else {
        console.error('not the same', testStr);
    }

    
}



module.exports = {
    convertSymbolMessage,
    formatSymbol
}