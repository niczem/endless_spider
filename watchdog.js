
const fs = require("fs");
const { exec } = require('child_process');


let interval = 2 //minutes
let filename = 'counter.txt';
let command = 'pm2 reload crawler1';
let counter_value, current_value;
let last_value = 0;
fs.readFile(filename, function(err, buf) {
  counter_value = parseInt(buf.toString());
  console.log('got initial counter value of '+counter_value);

  setInterval(function(){
    console.log('checking if counter value increased...');

    fs.readFile(filename, function(err_a, buf_a) {
      current_value = parseInt(buf_a.toString());

      if(isNaN(current_value))
        fs.writeFile(filename, last_value, (err)=>{
          process.exit(1);
        });
      else
        last_value = current_value;

      console.log('got current_value value of '+current_value+' from '+filename);
      if(counter_value <= current_value){
        console.log('same value. watchdog sets value +1 and restarts crawler'); 
        counter_value++;

        fs.writeFile(filename, counter_value, (err) => {
          if (err) console.log(err);
          console.log("counter updated, restarting proccess");


            exec(command, (err, stdout, stderr) => {
              if (err) {
                //some err occurred
                console.error(err)
              } else {
               // the *entire* stdout and stderr (buffered)
               console.log(`stdout: ${stdout}`);
               console.log(`stderr: ${stderr}`);


              }
            });

        });

      }else{
        console.log('values do not match... do nothing', current_value, counter_value);
      }


    });


  },interval*60000);
});
