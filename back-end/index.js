import express from "express";   
import chalk from "chalk"; 
import cors from 'cors'; 
import { MongoClient, ObjectId  } from "mongodb"; 
import 'dayjs/locale/pt-br.js'; 
import dayjs from 'dayjs'; 
import dotenv from "dotenv"; 
import joi from "joi";

const app = express(); 
app.use(cors()); 
app.use(express.json()); 
dotenv.config();  

const mongoClient = new MongoClient(process.env.MONGO_URI); 
var db; 

mongoClient.connect(() => { 
    db = mongoClient.db(process.env.DATABASE_NAME); 
}); 

const username = joi.object({ 
    name: joi.string().required()
});   

const message = joi.object({ 
   to: joi.string().required(),
   text: joi.string().required(), 
   type: joi.string().required() 
});

app.get("/participants", async (request,response) => { 

    try{ 
        const allParticipants = await db.collection('participants').find().toArray(); 
        response.status(200).send(allParticipants); 
        return;
    } catch(error) { 
        console.log(error); 
        response.sendStatus(500); 
        mongoClient.close();
    } 
}); 

app.post("/participants", async (request, response) => { 
    const usersName = { 
        name: request.body.name, 
        lastStatus: Date.now() 
    }
    
    const validation = username.validate(request.body, { abortEarly: true }); 

    if(validation.error) { 
        console.log(validation.error.details);
        response.sendStatus(422); 
        return;
    }
 
    let now = dayjs().locale('pt-br');
    let hoje = now.format("HH:mm:ss"); 

    const mensageUser = { 
        from: usersName.name, 
        to: "Todos", 
        text: "Entra na sala...", 
        type: "status", 
        time: hoje
    }   

    try { 
        const findRepeated = await db.collection('participants').findOne({name: usersName.name});  
        await db.collection('participants').insertOne(usersName);  
        await db.collection('status').insertOne(mensageUser);   
        console.log(findRepeated); 
        if(findRepeated) { 
            response.sendStatus(409); 
            return;
        }
    } catch(error) {
        console.log(error); 
        response.sendStatus(500);  
        mongoClient.close(); 
        return;
    }

    response.sendStatus(201); 
});    

app.get("/messages", async (request,response) => { 
    const limit = parseInt(request.query.limit); 

    try { 
        const allMensages = await db.collection('mensages').find().toArray();
        response.status(200).send(allMensages); 
        return;
    } catch(error) { 
        console.log(error);
        response.sendStatus(500);
        mongoClient.close(); 
        return;
    } 
}); 

app.post("/messages", async (request,response) => { 
    const validation = message.validate(request.body, { abortEarly: true }); 
    const user = request.headers.user;  

    let now = dayjs().locale('pt-br');
    let hoje = now.format("HH:mm:ss");  

    const sendText = {  
        from: user,
        to: request.body.to, 
        text: request.body.text, 
        type: request.body.type, 
        time: hoje
    }

    console.log(sendText); 
    console.log(user); 

    if(validation.error) { 
        console.log(validation.error.details); 
        response.sendStatus(422); 
        return;
    } 

    try {
        await db.collection('mensages').insertOne(sendText); 
    } catch(error) { 
        console.log(error); 
        response.sendStatus(500);
        mongoClient.close(); 
        return;
    }

    response.sendStatus(201);
}); 

app.post("/status", async (request,response) => { 
    const user = request.headers.user;  

    const users = { 
        name: user, 
        lastStatus: Date.now() 
    }  

    try { 
        const findParticipants = await db.collection('participants').findOne({name: user}); 
        if(!findParticipants.name) { 
            response.sendStatus(404);
            return;
        }
    } catch(error) { 
        console.log(error); 
        response.sendStatus(500);
        mongoClient.close();
        return;
    } 

    response.sendStatus(200);
});  

app.delete("/messages/:id", async (request,response) => {
    const id = request.params.id; 
    const user = request.headers.user; 

    console.log(id);

    try { 
        await db.collection('mensages').deleteOne({ _id: new ObjectId(id) });
    } catch(error) { 
        console.log(error);
        response.sendStatus(500); 
        return;
    } 

    response.sendStatus(200);
}) 

app.listen(process.env.PORT, () => { 
    console.log(chalk.blue.bold(`\nFuncionando na ${process.env.PORT}`));
})