const mongoose = require('mongoose')

async function connect(){
    try{
        await mongoose.connect('mongodb://localhost:27017/ticket_box_dev');
        console.log('Connect Successfully')
    }catch(error){
        console.log('Fail')
    }
}

module.exports = {connect}