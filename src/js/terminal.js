
var Terminal = {

    container: null,

    commandHistory: [],
    commandHistoryIndex: -1,

    currentPrompt: null,
    currentCommand: null,

    cli: null,

    initialize: function(container, cli) {

        this.container = container;
        this.cli = cli;

        this.terminalInput = this.container.find('.terminal-input');

        var promptSpan = $('<span class="prompt"></span>');
        promptSpan.append(cli.prompt(this));

        this.currentPrompt = $('<div></div>');
        this.currentPrompt.append(promptSpan);

        this.currentCommand = $('<span class="command"></span>');
        this.currentPrompt.append(this.currentCommand);
        this.currentPrompt.append($('<span class="cursor"></span>'));

        this.terminalInput.append(this.currentPrompt);


        this.loadCommandHistory();

        $(window).keypress(function(event){
            this.keypress(event)
        }.bind(this));

        $(window).keydown(function(event){
            this.keydown(event);
        }.bind(this));


        cli.welcomeMessages.forEach(function(message){
           this.out(message);
        }.bind(this));

        this.prompt();
    },

    // Process keystrokes
    keydown: function(event) {
        //console.log('keydown> ' + event.key + '(' + event.keyCode + ') ' + event.ctrlKey + ' - ' + event.shiftKey + ' - ' + event.altKey + ' - ' + event.metaKey);

        var command = this.currentCommand.text();

        if(event.ctrlKey){
            if(event.keyCode == 86){

                var pasteBlock = this.container.find('.terminal-paste');

                pasteBlock.css('visibility', 'visible');

                var pasteInput = pasteBlock.find('.terminal-paste-input');

                pasteInput.val('');
                pasteInput.focus();
                document.execCommand("Paste");

                pasteBlock.css('visibility', 'hidden');

                this.currentCommand.empty().append(command + pasteInput.val());
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
        return  (code >= 33 && code <= 127) || (code >= 1040 && code <= 1103);
    },

    // Outputs a line of text
    out: function(text) {

        if(text != ''){
            var terminalOutput = this.container.find('.terminal-output');

            var currentLines = parseInt(terminalOutput.attr('rows'));

            var textToAppend;

            if(currentLines > 0){
                textToAppend = '\n' + text;
            }else{
                textToAppend = text;
            }

            var numberOfLines = textToAppend.split("\n").length - 1;
            terminalOutput.attr('rows', currentLines + numberOfLines);
            terminalOutput.append(textToAppend);
        }
    },

    // Displays the prompt for command input
    prompt: function() {
        this.currentPrompt.find('.prompt').empty().append(cli.prompt(this));
        this.currentPrompt.find('.command').empty();
        window.scrollTo(0, this.currentPrompt.position().top);
    },

    storeCurrentCommand: function(){
        this.out(this.currentPrompt.find('.prompt').text() + this.currentPrompt.find('.command').text());
    },

    // Executes a command
    run: function() {
        var command = this.currentCommand.text();

        this.commandHistory.push(command);
        this.commandHistoryIndex = this.commandHistory.length;

        this.storeCommandHistory();

        var terminalInput = this.container.find('.terminal-input');
        terminalInput.css('visibility', 'hidden');

        this.executeCommand(command, this, function(context, response){

            if(response == null){
                context.out('Error: server request failed.')
            }else{
                context.out(response)
            }

            context.prompt();
            terminalInput.css('visibility', 'visible');
        })
    },

    executeCommand: function(cliCommand, context, onComplete) {
        try{
            cli.execute(cliCommand, context, onComplete);
        }catch(e){
            console.log(e);
            onComplete(context, 'Unexpected exception during command execution: ' + e)
        }
    },

    storeCommandHistory: function() {
        chrome.storage.local.set({'c3.command.history': JSON.stringify(this.commandHistory)});
    },

    loadCommandHistory: function() {
        var terminal = this;

        chrome.storage.local.get('c3.command.history', function(items){
            if(items != null){
                if(items.hasOwnProperty('c3.command.history')){
                    terminal.commandHistory = JSON.parse(items['c3.command.history']);
                    terminal.commandHistoryIndex = terminal.commandHistory.length;
                    console.log("Loaded " + terminal.commandHistoryIndex + " commands from history")
                }else{
                    terminal.commandHistory = [];
                }
            }else{
                terminal.commandHistory = [];
            }
        });
    }
};

