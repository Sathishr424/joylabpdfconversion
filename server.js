const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')
const pdf = require('pdf-parse');

const fs = require('fs');
const multer = require('multer');
const html_to_pdf = require('html-pdf-node');

const upload = multer({ dest: 'download/' });

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', express.static(process.cwd() + '/'));

app.route('/').get(function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

function getHtml(data, plain = false) {
    console.log(data)

    var margin = 3
    var html_start = `<html lang=""> <head> <meta charset="utf-8"> <title>JoyLab</title><style>*{padding:0;margin:0;font-family:Impact}body{display:flex;align-items:center;flex-direction:column;height:100vh;justify-content:space-around}.container{width:70%;display:flex;align-items:center;flex-direction:column;}.header{display:flex;flex-direction:column;justify-content:center;align-items:center}.header h1{white-space: nowrap; margin:15px;color:red;font-size:220%}.header p{margin:4px;font-weight:600;color:rgba(0,0,0,0.85)}hr{width:100%;margin:10px;background-color:#000;height:1px}#info{font-weight:700}#info p{margin:5px;color:rgba(0,0,0,0.85)}.row{width:97%;display:flex;flex-direction:row;justify-content:space-between}.column{display:flex;flex-direction:column}.column-left{display:flex;flex-direction:column;align-items:flex-start;align-content:flex-start}.column-right{display:flex;flex-direction:column;align-items:flex-end;align-content:flex-end}.footer{width:70%;display:flex;flex-direction:column;justify-content:center;align-items:center}.footer span{font-weight:500;margin:${margin}px}.footer p{font-size:110%;font-weight:500;margin:2px}.footer h2{margin:5px}#report{width:100%;display:flex;flex-direction:column;justify-content:center;margin:5px}#report h3{text-align:center;text-decoration:underline}.row-full td{font-size:100%;font-weight:500}.row-full th{text-decoration:underline;font-size:120%}.row-full td,.row-full th{text-align:end;padding:5px}.row-full tr{vertical-align:baseline} #info p{font-size: 90%}</style></head> <body> <div class="container"> <div class="header"> <h1>JOY CLINICAL LABORATORY</h1> <p>No: 41 Kalaignar High Road, Srinivasan nagar,</p> <p>New Perungalathur, Chennai-63</p> </div> <hr> <div id="info" class="row"> <div class="column-left"> <p>Patient Name : ${data.name}</p> <p>Age/Gender : ${data.age}</p> <p>Referred by Doctor: ${data.doctor}</p> </div> <div class="column-right"> <p>Date:${data.date}</p> </div> </div> <hr>` + (!plain ? `<div id="report"> <h3>${data.title}</h3><table class="row-full">` : '');

    var html_end = (!plain ? `</tbody> </table></div> ` : '') + `</div> <div class="footer"> <div style="margin:15px; margin-top:30px; width: 100%;"> <h3 style="text-align:end; margin-right: 5%; text-decoration: none;">Lab Technician</h3> </div> <hr> <span>ஜாய் இரத்தபரி சோதனை நிலையம்,</span> <span>நெ-41. கலைஞர் நெடுஞ்சாலை சீனி வாசநகர்</span> <span>புதுப்பெருங்களத்தூர்,சென்னை-63</span> <p>Phone: 9940240874/6374 609868</p> <h3>House Collection Available</h3> </div> </body></html>`;

    var mid_html = ""
    if (!plain) {
        if (data.report_type == 'sugar') {
            html_start += ` <thead> <tr> <th style="text-align: start;">TEST</th> <th>RESULT</th> <th>UNITS</th> <th>REFERENCE RANGE</th> </tr> </thead> <tbody>`;
            for (var r of data.report) {
                var nl = r[0].match(/(?<=\().*(?=\))/)
                var name = nl ? r[0].substring(0, r[0].indexOf(nl[0]) - 1).trim() : r[0]
                console.log(name, nl)
                mid_html += `<tr> <td style="text-align: start;">${name}` + (nl ? `<br>${'(' + nl[0].trim() + ')'}` : '') + `</td> <td>: ${r[1].split(' ')[0]}</td> <td>: ${r[1].split(' ')[1]}</td> <td>: (${r[2]})</td> </tr>`
            }
        } else if (data.report_type == 'blood') {
            mid_html += `<thead><tr> <th style="text-align: start; text-decoration: none">${data.report.title} <span style="margin: 0px 10px;">:</span> ${data.report.data}</th></tr></thead> <tbody>`;
        }
    }
    return html_start + mid_html + html_end;
}

const getReportForSugar = (val) => {

}

app.post('/convert', upload.single('pdf'), async (req, res) => {
    const report_type = req.body.type;

    if (report_type == undefined) return res.status(404).json({ error: "NOT FOUND" });

    fs.readdir(path.join(__dirname, 'download'), async (err, files) => {
        if (err) throw err;

        for (const file of files) {
            console.log('File', file, req.file['filename'])
            if (file != req.file['filename']) fs.unlink(path.join(path.join(__dirname, 'download'), file), err => {
                if (err) throw err;
            });
        }
    });

    var file = req.file;
    console.log("Building PDF..");
    try {
        let dataBuffer = fs.readFileSync(path.join(__dirname, file.path));

        pdf(dataBuffer).then(function (data_text) {
            // fs.writeFileSync(__dirname + '/output.txt', data_text.text);
            var text = data_text.text.split('\n')
            var x = data_text.text
            text = text.filter(t => t.search("Re-print") == -1)
            console.log(text);

            let r_date = text[9].match(/\d[0-9/]+/)
            var ret_data = {
                date: text[6],
                r_date: r_date ? r_date[0] : "",
                name: text[12].match(/^\w[a-zA-Z. ]+/)[0].trim(),
                age: text[12].match(/\(.*\)/)[0].replace(/\((.*)\)/, '$1'),
                title: "",
                report: [],
                report_type,
                doctor: x.indexOf('Doctor') != -1 ? x.match(/(?<=\nDoctor\n).*(?=\n)/)[0].replace(',', '') : 'Self'
            }

            var y = x.match(/(?<=\n:\n(:\n){1,3})[^:](\s|.)*(?=\* End.*)/)[0]
            ret_data.title = y.split('\n')[0]

            try {
                if (report_type == 'sugar') {
                    var reports = y.match(/\n.+\n.+\n:\n.+/g)
                    console.log(reports)
                    for (var r of reports) {
                        r = r.substring(1).split('\n')
                        ret_data.report.push([
                            r[0].match(/.*\D(?=\d+\smg)/)[0],
                            r[0].match(/\d+\smg.*/)[0],
                            r[1],
                            r.slice(2).join('\n').match(/[^:\n].*/)[0]
                        ])
                    }
                } else if (report_type == 'blood') {
                    let blood = y.split('\n')[1].replace('BLOOD GROUP & RH  TYPE', '');
                    ret_data.report = { title: 'BLOOD GROUP & RH  TYPE', data: blood };
                }
            } catch {
                ret_data.report = [];
                var data = getHtml(ret_data, true);

                fs.writeFileSync(__dirname + '/output_pdf.html', data);

                var options = { format: 'A4', path: __dirname + "/output_pdf.pdf", margin: { bottom: "20px", top: "40px", left: 0, right: 0 } };
                let file_data = { content: data };

                html_to_pdf.generatePdf(file_data, options).then(pdfBuffer => {
                    console.log('success');
                    res.setHeader('Content-disposition', 'attachment; filename=output.pdf');
                    res.setHeader('Content-type', 'application/pdf');
                    res.download(`${__dirname}/output_pdf.pdf`, 'output.pdf');
                });
                return
            }

            console.log(ret_data);
            var data = getHtml(ret_data);

            fs.writeFileSync(__dirname + '/output_pdf.html', data);

            var options = { format: 'A4', path: __dirname + "/output_pdf.pdf", margin: { bottom: "20px", top: "40px", left: 0, right: 0 } };
            let file_data = { content: data };
            html_to_pdf.generatePdf(file_data, options).then(pdfBuffer => {
                console.log('success');
                res.setHeader('Content-disposition', 'attachment; filename=output.pdf');
                res.setHeader('Content-type', 'application/pdf');
                res.download(`${__dirname}/output_pdf.pdf`, 'output.pdf');
            });
        });
    } catch (error) {
        console.log(error);
        res.send({ 'error': error });
    }
})

const listener = app.listen(process.env.PORT || 4000, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});