const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const conf = JSON.parse(fs.readFileSync('../conf.json'));
const token = conf.key;
const bot = new TelegramBot(token, { polling: true });

let model;

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "/start") {
        bot.sendMessage(chatId, "Dimmi il modello della macchina.");
    } else {
        model = text;
        bot.sendMessage(chatId, `Modello ricevuto: ${text}. Sto cercando le informazioni...`);
        await getCarInfoByModel(model, chatId);
    }
});


async function getMarcas() {
    const url = `https://parallelum.com.br/fipe/api/v1/carros/marcas`;

    try {
        const response = await fetch(url);
        console.log(response)
        return await response.json();
    } catch (error) {
        console.error('Errore nel recupero delle marche:', error);
        return null;
    }
}

async function getModels(marcaId) {
    const url = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaId}/modelos`;

    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Errore nel recupero dei modelli:', error);
        return null;
    }
}

async function getCarInfoByModel(modelo, chatId) {
    console.log(`Sto cercando il modello: ${modelo}`);

    const marcas = await getMarcas();
    if (marcas && marcas.length > 0) {
      console.log("dentro IF")
        let marcaFound = null;

        for (const marca of marcas) {
          console.log("sto cercando FUORI...")
            const modelsData = await getModels(marca.codigo);
            
            if (modelsData && modelsData.modelos) {
                for (const model of modelsData.modelos) {
                  console.log("sto cercando DENTRO...")  
                  if (model.nome.toLowerCase() === modelo.toLowerCase()) {
                        marcaFound = marca;
                        console.log(`Marca trovata: ${marca.nome}, Modello trovato: ${model.nome}`);
                        
                        await getAnos(marca.codigo, model.codigo, chatId);
                        return;
                    }
                }
            }
            
        }
    }
}

async function getAnos(marcaId, modeloId, chatId) {
    const url = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaId}/modelos/${modeloId}/anos`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.length > 0) {
            console.log("Anni trovati:", data);
            const anoFormatted = data[0].codigo;
            await getFinalData(marcaId, modeloId, anoFormatted, chatId);
        } else {
            console.log("Anno non trovato.");
            bot.sendMessage(chatId, "Non sono riuscito a trovare gli anni per questo modello.");
        }
    } catch (error) {
        console.error('Errore nel recupero degli anni:', error);
        bot.sendMessage(chatId, "Errore nel recupero degli anni.");
    }
}

async function getFinalData(marcaId, modeloId, anoFormatted, chatId) {
    const url = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaId}/modelos/${modeloId}/anos/${anoFormatted}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data) {
            console.log("Dati finali trovati:", data);
            const valor = data.Valor;
            const marca = data.Marca;
            const modelo = data.Modelo;
            const anoModelo = data.AnoModelo;
            const combustivel = data.Combustivel;

            const responseMessage = `
Il veicolo che hai cercato, ${modelo}, è di ${marca} con un motore a ${combustivel}.
Questo veicolo è del ${anoModelo}, con un valore pari a ${valor}.
            `;

            bot.sendMessage(chatId, responseMessage);
        } else {
            bot.sendMessage(chatId, "Non sono riuscito a trovare informazioni per questo modello.");
        }
    } catch (error) {
        console.error('Errore nel recupero dei dati finali:', error);
        bot.sendMessage(chatId, "Errore nel recupero dei dati.");
    }
}
