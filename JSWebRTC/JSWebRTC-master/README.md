# JSWebRTC
WebRTC webapplication using node js and Javascript.

## Steps to run the application:
1. Make sure you have node js installed
2. Open a terminal on the root folder and run using : node index.js
3. Install any dependencies if required (using : npm <dependency-name>)
4. Open http://localhost:8081/ on chrome web browser


## Steps to use the application:
1. Click the start button when you open the above url on the browser that will create a room named "foo"
   also making the creator the host
2. Open a new browser window (or use another device by accessing the local url of your system) 
   and open the same url (http://localhost:8081/) and click on start and you should see new buttons to call
   click on that and on host window you will see a dialog to ask permission, click ok to allow.
3. Now you should see two video streams in the two windows, repeat the steps with more windows to add more clients to the room
4. The limit for now is 3 Main clients (SuperNodes) and every supernode can have 5 clients (18 Clients, you can change it in the main.js file)
