#MW Pinboard

This is a simple pinboard web app.
You can create notes on a virtual pinboard, move them around, resize and edit them.
Furthermore you have editable fields to structure resp. group your notes.
The notes are stored locally in your Browser. (using localStorage)

### Compatibility
The app is tested with current versions of the following desktop browsers:
* Firefox 15
* Opera 12
* Chrome 23
* IE 9

If you find bugs or have any suggestions,
please drop a comment here on github.
Pull requests are welcome too.

###Live demo
You can see a live demo [here](http://pinboard.mwin.de/).

###Install / Running from your own server
If you want to run this app from your own webserver,
simply copy the files into any directory on your server.
There are no other dependencies resp. additional server capabilities
needed than the ability to deliver html files ;-)
You might even run it from your local hard drive by just clicking on index.html.

###Additional notes
When the app starts the first time, it stores the browser window size.
Consecutive starts of the app restores the saved pinboard size,
even if the browser size differs.
This is to avoid re-positioning of all the notes, which you might not like.
(at least i dont like it, i like my notes to stay where i have them positiond,
regardless of the browser window size)

You can manually resize the pinboard by clicking the corresponding menu item.

###ToDo / Future plans
Currently i am working on a server based version,
where the board and notes are stored remotely, optional encrypted.
This will be done with node.js/express/mongo db.
A server based version would enable one to access his notes
from every browser resp. location.
