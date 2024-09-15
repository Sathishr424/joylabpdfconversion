const express     = require('express');
const bodyParser  = require('body-parser');
const path = require('path')

const fs = require('fs');
const multer  = require('multer');
const html_to_pdf = require('html-pdf-node');

const extract = require('pdf-text-extract');
const { start } = require('repl');
const upload = multer({dest: 'download/'});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', express.static(process.cwd() + '/'));
//Index page (static HTML)

app.route('/').get(function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
// console.log(path.join(__dirname, '/AlumniSans-Regular.ttf'))
function getHtml(data){
    // fontPath = fs.readFileSync(path.join(__dirname, '/AlumniSans-Regular.ttf'));
    // const alumiFont = fontPath.toString('base64');
    var html_start = `<html lang=""> <head> <meta charset="utf-8"> <title>JoyLab</title><style>*{padding:0;margin:0;font-family:Impact}.container{display:flex;justify-content:center;align-items:center;flex-direction:column;margin:5% 10%}.header{display:flex;flex-direction:column;justify-content:center;align-items:center}.header h1{margin:15px;color:red;font-size:220%}.header p{margin:4px;font-weight:600;color:rgba(0,0,0,0.85)}hr{width:100%;margin:10px;background-color:#000;height:1px}#info{font-weight:700}#info p{margin:3px;color:rgba(0,0,0,0.85)}.row{width:97%;display:flex;flex-direction:row;justify-content:space-between}.column{display:flex;flex-direction:column}.column-left{display:flex;flex-direction:column;align-items:flex-start;align-content:flex-start}.column-right{display:flex;flex-direction:column;align-items:flex-end;align-content:flex-end}.footer{display:flex;flex-direction:column;justify-content:center;align-items:center}.footer span{font-weight:600;margin:-3px}.footer p{font-size:110%;font-weight:600;margin:2px}.footer h2{margin:5px}#report{width:100%;display:flex;flex-direction:column;justify-content:center;margin:5px}#report h3{text-align:center;text-decoration:underline}.row-full td{font-size:100%;font-weight:500}.row-full th{text-decoration:underline;font-size:120%}.row-full td,.row-full th{text-align:end;padding:2px}.row-full tr{vertical-align:baseline}</style></head> <body> <div class="container"> <div class="header"> <h1>JOY CLINICAL LABORATORY</h1> <p>No: 8, Kalaivani Street, Srinivasanagar,</p> <p>New Perungalathur, Chennai-63</p> </div> <hr> <div id="info" class="row"> <div class="column-left"> <p>Patient Name : ${data.name}</p> <p>Age/Gender : ${data.age}</p> <p>Referred by Doctor: Self</p> </div> <div class="column-right"> <p>Date:${data.date}</p> <p>Collection Date:${data.date}</p> <p>Received date :${data.date}</p> <p>Report date :${data.r_date}</p> </div> </div> <hr> <div id="report"> <h3>${data.title}</h3> <table class="row-full"> <thead> <tr> <th style="text-align: start;">TEST</th> <th>RESULT</th> <th>UNITS</th> <th>REFERENCE RANGE</th> </tr> </thead> <tbody>`;
    
    var html_end = `</tbody> </table> </div> <hr> <div class="footer"> <span>ஜாய் இரத்த பரி சோதனை நிலையம்,.</span> <span>நெ.8. கலைவாணி தெரு,சீனி வாசநகர் ,புதுப</span> <span>பெருங்களத்தூர்,சென்னை-63</span> <p>Cello: 9940240874 /6374 609868</p> <h3>House Collection Available</h3> </div> </div> </body></html>`;
    var mid_html = ""
    console.log(data.report)
    for (var r of data.report){
        // console.log(r)
        var d = r[0].split(":");
        // console.log(d)
        var vals = d[1].match(/\d[0-9- ]+\s[a-z/]+/g)
        mid_html += `<tr> <td style="text-align: start;">${d[0].substring(0, d[0].indexOf('(')).trim()}<br>${d[0].substring(d[0].indexOf('(')).replace('*', '').trim()} </td> <td>: ${vals[0].split(' ')[0]}</td> <td>: ${vals[0].split(' ')[1]}</td> <td>: (${vals[1]})</td> </tr>`
    }

    return html_start + mid_html + html_end;
}

function getPDFData(pdf) {
    var ret_data = {
        date: "",
        r_date: "",
        name: "",
        age: "",
        title: "",
        report: []
    }
    var start_index = -1;
    var end_index = -1;
    var raw_data = []
    extract(path.join(__dirname, 'input.pdf'), function (err, pages) {
        if (err) {
        console.dir(err)
        return
        }
        var str = ""
        var data = []
        for (var p of pages){
            if (p !== '\n'){
                data = p.split('\n')
                // console.log(data)
                space_count = 0
                is_space = false
                for (var i=0; i<data.length; i++){
                    d = data[i]
                    s = d.replace(/\s{2,}/g, ' ').trim().replace('GLUCOSE', 'BLOOD SUGAR')
                    data[i] = s
                    raw_data.push(s)
                    str += s + "\n"
                    if (s.search('Sample Dt') != -1){
                        ret_data.date = s.substring(s.search(':')+1).trim()
                    }
                    else if (s.search('Report Dt') != -1){
                        ret_data.r_date = s.substring(s.search(':')+1).trim()
                    }else if (s.search('Name :') != -1){
                        ret_data.name = s.substring(s.search(':')+10, s.indexOf("(")).trim()
                        ret_data.age = s.substring(s.indexOf('(')+1, s.indexOf(')')).trim()
                    }else if(s.search("Sample collected and sent") != -1){
                        ret_data.title = data[i+2].replace(/\s{2,}/g, ' ').trim()
                        start_index = i+3
                        // console.log("SPACE:", data[i+1], data[i+1].length)
                    }

                    if (start_index != -1 && i > start_index+1 && end_index == -1){
                        if (d.length == 0) is_space = true;
                        else is_space = false;

                        if (is_space) space_count += 1

                        if (space_count >= 4) end_index = i
                    }
                    
                }
            }
        }
        var x = data.slice(start_index, end_index)
        var last_space = -1
        for (var i=0; i<x.length; i++){
            if (x[i].length == 0){
                if (last_space != -1 && last_space != i-1){
                    ret_data.report.push(x.slice(last_space+1, i))
                }last_space = i
            }
        }
        // console.log(x)
        fs.writeFileSync(__dirname + '/input.txt', str);
        downloadConvertedPDF(getHtml(ret_data))
        console.log(ret_data)
    })
}

function downloadConvertedPDF(data){
    try{
        fs.writeFileSync(__dirname + '/output_pdf.html', data);
        var fileData = fs.readFileSync(__dirname + '/output_pdf.html', 'utf8');
        // console.log(fileData);
        var options = { format: 'A4', path: __dirname + "/output_pdf.pdf", margin: {bottom: "20px", top: "40px", left: 0, right: 0}};
        let file = { content: data };
    //     console.log(resume);
        html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
            console.log("PDF Buffer:-", pdfBuffer);
            
        });
    }catch (error) {
      console.log(error)
    }
}

getPDFData()

app.route('/convert')
  .post((req,res)=>{
    console.log("Building PDF..");
    try{
        var resume = `<html><head><style>${req.body.style}</style></head><body>${req.body.resume}</body></html>`;
        fs.writeFileSync(__dirname + '/Resumes/resume.html', resume);
        var fileData = fs.readFileSync(__dirname + '/Resumes/resume.html', 'utf8');
        // console.log(fileData);
        var options = { format: 'A4', path: __dirname + "/Resumes/resume.pdf", margin: {bottom: "20px", top: "40px", left: 0, right: 0}};
        let file = { content: fileData };
    //     console.log(resume);
        html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
            // console.log("PDF Buffer:-", pdfBuffer);
            res.setHeader('Content-disposition', 'attachment; filename=resume.pdf');
            res.setHeader('Content-type', 'application/pdf');
            res.download(`${__dirname}/Resumes/resume.pdf`, 'resume.pdf');
        });
    }catch (error) {
      res.send(error);
    }
  })

// const listener = app.listen(process.env.PORT || 4000, function () {
//     console.log('Your app is listening on port ' + listener.address().port);
// });