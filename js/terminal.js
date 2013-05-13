
var Terminal = {

    commandHistory: [],
    commandHistoryIndex: -1,

    supportsStorage: supports_html5_storage(),

    c3Host: null,
    c3Domain: null,
    c3Key: null,
    c3CurrentDir: "/",
    c3CurrentDirName: "/",

    initialize: function(container) {
        this.terminal = container;

        this.loadCommandHistory();

        this.out('Welcome to C3 file browser');
        this.out('Type help to get list of available commands');
        this.prompt();

        this.path = '.';

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

                var pasteBlock = $('paste-block');
                pasteBlock.style.visibility = 'visible';

                var pasteInput = $('paste-block-input');

                pasteInput.value = '';
                pasteInput.focus();
                document.execCommand("Paste");

                pasteBlock.style.visibility = 'hidden';
                this.currentCommand.set('html', command + pasteInput.value);
            }
        }


        if (event.ctrlKey || event.altKey || event.metaKey) return;

        if (event.keyCode == 13 /*Enter*/) {
            event.preventDefault();
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
                this.currentCommand.set('html', this.commandHistory[this.commandHistoryIndex]);
            }
            return;
        }

        if (event.keyCode == 40) { // Down arrow
            event.preventDefault();
            //dbg(this.commandHistoryIndex + ', ' + this.commandHistory.length);
            if (this.commandHistoryIndex < this.commandHistory.length) {
                this.commandHistoryIndex++;
                this.currentCommand.set('html', this.commandHistory[this.commandHistoryIndex]);
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
        var p = $('<div></div>');
        p.append(text)
        this.terminal.append(p);
    },

    // Displays the prompt for command input
    prompt: function() {
        if (this.currentPrompt)
            this.currentPrompt.find('.cursor').remove();

        var promptSpan = $('<span class="prompt"></span>');
        promptSpan.append(this.promptString());

        this.currentPrompt = $('<div></div>');
        this.currentPrompt.append(promptSpan);

        this.currentCommand = $('<span class="command"></span>');
        this.currentPrompt.append(this.currentCommand);
        this.currentPrompt.append($('<span class="cursor"></span>'));

        this.terminal.append(this.currentPrompt);

        window.scrollTo(0, this.currentPrompt.position().top);
    },

    promptString: function(){
        if(this.c3Host == null){
            return "::";
        }else{
            return this.c3Host + "::" + this.c3CurrentDirName + ":";
        }
    },

    // Executes a command
    run: function() {
        var command = this.currentCommand.text();

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
        try{
            cliExecuteCommand(cliCommand, context, onComplete)
        }catch(e){
            onComplete(context, 'Unexpected exception during command execution: ' + e)
        }
    },

    storeCommandHistory: function() {
        if(this.supportsStorage){
            window['localStorage'].setItem("c3.command.history", JSON.encode(this.commandHistory));
        }
    },

    loadCommandHistory: function() {
        if(this.supportsStorage){
            var savedCommandHistory = window['localStorage'].getItem("c3.command.history");

            if(savedCommandHistory != null){
                this.commandHistory = JSON.decode(savedCommandHistory);
                this.commandHistoryIndex = this.commandHistory.length;
            }else{
                this.commandHistory = [];
            }

        }
    }
};

function supports_html5_storage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

$(window).terminal = Terminal.initialize($('#terminal'));
