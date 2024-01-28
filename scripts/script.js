var Typer = {
    text: '',
    index: 0,
    speed: 3,
    file: './assets/terminal-content.txt',

    // Initialization function
    init: function () {
        // Load text from file
        $.get(this.file, function (data) {
            Typer.text = data.slice(0, -1); // Remove the last character (assumed to be newline)
        });
    },

    // Write text to the console
    write: function (str) {
        $('#console').append(str);
    },

    // Add text based on key events
    addText: function (key) {
        if (Typer.text) {
            var cont = Typer.content();
            if (cont.endsWith('|')) {
                $('#console').html(cont.slice(0, -1));
            }

            if (key.keyCode != 8) {
                Typer.index += Typer.speed;
            } else {
                if (Typer.index > 0) Typer.index -= Typer.speed;
            }

            var text = Typer.text.substring(0, Typer.index);
            var rtn = /\n/g;

            // Update console content and scroll window
            $('#console').html(text.replace(rtn, '<br/>'));
            window.scrollBy(0, 50);

            // Use Linkify.js to make URLs clickable
//            linkifyElement(document.getElementById('console'));
        }

        if (key.keyCode == 27) {
            Typer.index = Typer.text.length;
        }
    },

    // Get the current content of the console
    content: function () {
        return $('#console').html();
    },

    // Update the last character on the console
    updLstChr: function () {
        var cont = this.content();

        if (cont.endsWith('|')) {
            $('#console').html(cont.slice(0, -1));
        } else {
            this.write('|');
        }
    },
};

// Initialization
Typer.init();

// Use a timer to simulate typing
var timer = setInterval(function () {
    Typer.addText({ keyCode: 123748 });
}, 30);

// Event listener for keydown to fast forward the text
document.onkeydown = function (e) {
    Typer.addText(e);
};
