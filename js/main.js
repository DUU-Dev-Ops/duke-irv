function processVotingData(data) {
    console.log(data);
}

function cleanData(fields, data) {
    return data.map(function(vote) {
        var newVote = {};
        Object.keys(fields).forEach(function(position) {
            newVote[position] = [];
            for (var i = 1; i <= fields[position]; i++) {
                newVote[position].push(vote[position + " - " + i]);
            }
        });
        return newVote;
    });
}

function processFields(fieldsArr) {
    var fields = {};
    fieldsArr.forEach(function(field) {
        var result = /(.*) - \d+/.exec(field);
        if (!result || result.length < 2) return;
        var fieldName = result[1];
        if (!fields[fieldName]) fields[fieldName] = 0;
        fields[fieldName] += 1;
    })
    return fields;
}

function loadHandler(event) {
    var csv = event.target.result;
    var parseConfig = {
        header: true,
    }
    var data = Papa.parse(csv, parseConfig);
    var fields = processFields(data.meta.fields);
    var votes = cleanData(fields, data.data);
    processVotingData(votes);
}

function errorHandler(evt) {
    if (evt.target.error.name == "NotReadableError") {
        alert("Cannot read file!");
    }
}

function getAsText(fileToRead) {
    var reader = new FileReader();
    reader.readAsText(fileToRead);
    reader.onload = loadHandler;
    reader.onerror = errorHandler;
}

function handleFiles(files) {
    if (window.FileReader) {
        getAsText(files[0]);
    } else {
        alert('FileReader are not supported in this browser.');
    }
}
