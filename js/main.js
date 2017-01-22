var app = new Vue({
    el: '#app',
    data: {
        positions: [],
        allResults: {},
        currPos: '',
        results: {},
        voteCount: 0
    },
    methods: {
        setCurrPos: function(position) {
            var ctx = this;
            this.currPos = position;
            this.results = {};
            setTimeout(function() {
                ctx.results = ctx.allResults[position];
            }, 100);
        },
        downloadVotes: function() {
            var ctx = this;
            var voteArray = this.results.validVotes.map(function(vote) {
                return vote[ctx.currPos];
            });
            var csv = Papa.unparse(voteArray);
            download(csv, this.currPos.replace(/\W/g, '') + ".csv", "text/csv")
        }
    }
})

function processVotingData(votes, positions) {
    var positionsArray = Object.keys(positions);
    var allResults = {};
    positionsArray.forEach(function(position) {
        var res = {};
        res.validVotes = getValidVotes(votes, position);
        res.voteCount = res.validVotes.length;
        res.rounds = [];
        var r = 1;
        var tally = {};
        var eliminated = [];
        var loser;
        var chartData;
        var stackedData = [];
        do {
            tally = tallyVotes(res.validVotes, position, eliminated);
            loser = getLastPlace(tally)
            eliminated.push(loser);
            chartData = $.extend({}, tally.candidates);
            chartData["Exhausted"] = tally.spent;
            if (r > 1) {
                var newVotes = {};
                var oldVotes = {};
                Object.keys(chartData).forEach(function(k) {
                    oldVotes[k] = res.rounds[r - 2].chartData[k];
                    newVotes[k] = chartData[k] - res.rounds[r - 2].chartData[k];
                })
                stackedData = [{
                    name: "Before instant Runoff",
                    data: oldVotes
                }, {
                    name: "New Votes",
                    data: newVotes
                }];
            }
            res.rounds.push({
                loser: loser,
                number: r,
                chartData: chartData,
                stackedData: stackedData
            })
            r++;
        } while (!majorityWinner(tally))
        res.winner = majorityWinner(tally);
        allResults[position] = res;
    });
    app.positions = positionsArray;
    app.currPos = positionsArray[0];
    app.allResults = allResults;
    app.results = allResults[app.currPos];
    app.voteCount = votes.length;
}

function getLastPlace(tally) {
    return Object.keys(tally.candidates).reduce(function(a, b) {
        return tally.candidates[a] < tally.candidates[b] ? a : b
    });
}

function majorityWinner(tally) {
    var winner = Object.keys(tally.candidates).reduce(function(a, b) {
        return tally.candidates[a] > tally.candidates[b] ? a : b
    });
    var voteSum = Object.keys(tally.candidates).reduce(function(a, b) {
        return tally.candidates[a] + tally.candidates[b]
    });
    if (tally.candidates[winner] / voteSum > 0.5) return winner;
    return null;
}

function tallyVotes(votes, position, eliminated) {
    var tally = {};
    tally.candidates = {};
    tally.spent = 0;
    votes.forEach(function(vote) {
        let fixedVote = vote[position].filter(function(candidate) {
            return eliminated.indexOf(candidate) < 0;
        });
        if (fixedVote.length > 0) {
            if (!tally.candidates[fixedVote[0]]) tally.candidates[fixedVote[0]] = 0;
            tally.candidates[fixedVote[0]]++;
        } else {
            tally.spent++;
        }
    })
    return tally;
}



function getValidVotes(votes, position) {
    return votes.filter(function(vote) {
        return vote[position].length > 0;
    })
}

function cleanData(fields, data) {
    return data.map(function(vote) {
        var newVote = {};
        Object.keys(fields).forEach(function(position) {
            newVote[position] = [];
            for (var i = 1; i <= fields[position]; i++) {
                if (vote[position + " - " + i])
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
    var positions = processFields(data.meta.fields);
    var votes = cleanData(positions, data.data);
    processVotingData(votes, positions);
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
