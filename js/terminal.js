
var Terminal = {

    commandHistory: [],
    commandHistoryIndex: -1,

    c3Host: null,
    c3Domain: null,
    c3Key: null,
    c3CurrentDir: "/",
    c3CurrentDirName: "/",

    initialize: function(container) {
        this.terminal = container;

        var promptSpan = $('<span class="prompt"></span>');
        promptSpan.append(this.promptString());

        this.currentPrompt = $('<div></div>');
        this.currentPrompt.append(promptSpan);

        this.currentCommand = $('<span class="command"></span>');
        this.currentPrompt.append(this.currentCommand);
        this.currentPrompt.append($('<span class="cursor"></span>'));

        this.terminal.append(this.currentPrompt);


        this.loadCommandHistory();

        this.out('Welcome to C3 file browser');
        this.out('Type help to get list of available commands');
        this.prompt();

        $(window).keypress(function(event){
           this.keypress(event)
        }.bind(this));

        $(window).keydown(function(event){
           this.keydown(event);
        }.bind(this));
    },

    // Process keystrokes
    keydown: function(event) {
        //console.log('keydown> ' + event.key + '(' + event.keyCode + ') ' + event.ctrlKey + ' - ' + event.shiftKey + ' - ' + event.altKey + ' - ' + event.metaKey);

        var command = this.currentCommand.text();

        if(event.ctrlKey){
            if(event.keyCode == 86){

                var pasteBlock = $('#paste-block');
                pasteBlock.style.visibility = 'visible';

                var pasteInput = $('#paste-block-input');

                pasteInput.value = '';
                pasteInput.focus();
                document.execCommand("Paste");

                pasteBlock.style.visibility = 'hidden';
                this.currentCommand.empty().append(command + pasteInput.value);
            }
        }


        if (event.ctrlKey || event.altKey || event.metaKey) return;

        if (event.keyCode == 13 /*Enter*/) {
            event.preventDefault();

            this.storeCurrentCommand();

            if(command != ''){
                this.run();
            }else{
                this.prompt();
            }
            return;
        }

        if (event.keyCode == 8 /*backspace*/) {
            event.preventDefault();
            if (command.substr(command.length-6) == '&nbsp;') {
                command = command.substr(0, command.length-6);
            } else {
                command = command.substr(0, command.length-1);
            }
            this.currentCommand.empty().append(command);
            return;
        }

        if (event.keyCode == 38) { // Up arrow
            event.preventDefault();
            //dbg(this.commandHistoryIndex + ', ' + this.commandHistory.length);
            if (this.commandHistoryIndex > 0) {
                this.commandHistoryIndex--;
                this.currentCommand.empty().append(this.commandHistory[this.commandHistoryIndex]);
            }
            return;
        }

        if (event.keyCode == 40) { // Down arrow
            event.preventDefault();
            //dbg(this.commandHistoryIndex + ', ' + this.commandHistory.length);
            if (this.commandHistoryIndex < this.commandHistory.length) {
                this.commandHistoryIndex++;
                this.currentCommand.empty().append(this.commandHistory[this.commandHistoryIndex]);
                // This can overflow the array by 1, which will clear the command line
            }
        }

    },

    keypress: function(event) {
        //console.log('keypress> ' + event.key + '(' + event.keyCode + ') ' + event.ctrlKey + ' - ' + event.shiftKey + ' - ' + event.altKey + ' - ' + event.metaKey);

        if (event.ctrlKey /*|| event.shift*/ || event.altKey || event.metaKey) return;
        var command = this.currentCommand.text();

        if (event.keyCode == 32 /*space*/) {
            event.preventDefault();
            command += ' ';
            this.currentCommand.empty().append(command);
            return;
        }

        // For all typing keys
        if (this.validkey(event.keyCode)) {
            event.preventDefault();
            if (event.keyCode == 46) {
                command += '.';
            } else {
                if(event.shiftKey){
                    command += String.fromCharCode(event.keyCode).toUpperCase();
                }else{
                    command += String.fromCharCode(event.keyCode);
                }
            }

            //this.currentCommand.;
            this.currentCommand.empty().append(command);
        }
    },

    validkey: function(code) {
        return  (code >= 33 && code <= 127);
    },

    // Outputs a line of text
    out: function(text) {

        if(text != ''){
            var terminalOutput = $('#terminaloutput');

            var currentLines = parseInt(terminalOutput.attr('rows'));

            var textToAppend;

            if(currentLines > 0){
                textToAppend = '\n' + text;
            }else{
                textToAppend = text;
            }

            var numberOfLines = textToAppend.split("\n").length - 1;

            terminalOutput.append(textToAppend);
            terminalOutput.attr('rows', currentLines + numberOfLines);
        }
    },

    // Displays the prompt for command input
    prompt: function() {
        this.currentPrompt.find('.prompt').empty().append(this.promptString());
        this.currentPrompt.find('.command').empty();
        window.scrollTo(0, this.currentPrompt.position().top);
    },

    promptString: function(){
        if(this.c3Host == null){
            return ":: ";
        }else{
            return this.c3Host + "::" + this.c3CurrentDirName + ": ";
        }
    },

    storeCurrentCommand: function(){
        this.out(this.currentPrompt.find('.prompt').text() + this.currentPrompt.find('.command').text());
    },

    // Executes a command
    run: function() {
        var command = this.currentCommand.text();

        document.execCommand('SelectAll');
        document.execCommand('Copy');


        this.commandHistory.push(command);
        this.commandHistoryIndex = this.commandHistory.length;

        this.storeCommandHistory();

        this.executeCommand(command, this, function(context, response){

            if(response == null){
                context.out('Error: server request failed.')
            }else{
                context.out(response)
            }

            context.prompt()
        })
    },

    executeCommand: function(cliCommand, context, onComplete) {
//        try{
            cliExecuteCommand(cliCommand, context, onComplete);
//        }catch(e){
//            console.log(e);
//            onComplete(context, 'Unexpected exception during command execution: ' + e)
//        }
    },

    storeCommandHistory: function() {

        chrome.storage.local.set({'c3.command.history': JSON.stringify(this.commandHistory)});

        if(this.supportsStorage){
            window['localStorage'].setItem("c3.command.history", JSON.stringify(this.commandHistory));
        }
    },

    loadCommandHistory: function() {
        var terminal = this;

        chrome.storage.local.get('c3.command.history', function(items){
            if(items != null){
                if(items.hasOwnProperty('c3.command.history')){
                    terminal.commandHistory = JSON.parse(items['c3.command.history']);
                    terminal.commandHistoryIndex = terminal.commandHistory.length;
                    console.log("Loaded " + terminal.commandHistoryIndex + " command for command history")
                }else{
                    terminal.commandHistory = [];
                }
            }else{
                terminal.commandHistory = [];
            }
        });
    }
};

$(window).terminal = Terminal.initialize($('#terminal'));
