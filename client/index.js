import { Groubit } from './groubit.js';

// Used for key generation
// Statistically the number of digits used for the actual keys
// will be half of this.
// This is because when generating the keys, the message reciever
// needs to guess between using read or iread on a stream of the groubits
// in order to try and decode it into bits.
const DIGITS = 512;

// DOM nodes
const usernameInput = document.getElementById('username-input');
const messageDiv = document.getElementById('message-div');
const messageInput = document.getElementById('message-input');
const onlineUserList = document.getElementById('online-users');
const messages = document.getElementById('messages');

let socket = io();

// Name seen by other users
let from = '';

// Keys a client shares with other clients
// Follows the format:
// { 'username': { key, bases } }
const keys = {};

// Currently selected online user
let recipient = '';

socket.on('connected', () => {
    console.log('Connected');
});

socket.on('receive_message', ({ from, message }) => {
    const decodedMessage = rc4(keys[from].key, message);

    const messageElement = document.createElement('li');
    messageElement.innerText = `${from}: ${decodedMessage}`;
    messages.appendChild(messageElement);
});

socket.on('users_updated', ({ users }) => {
    updateOnlineUsers(users);
});

socket.on('recieve_groubits', (data) => {
    // This is not ideal, but we need groubits to be able to be
    // serialized in order to be transmitted and still be able to
    // maintain the same information. This is to simulate grouits
    // in a groubit channel, we're not using an actual physical
    // groubit channel. In an actual physical groubit channel
    // groubits wouldn't need to be reconstructed like this.
    const gbits = JSON.parse(data.groubits).map(obj => new Groubit(obj));
    const { bits, bases } = decodeGroubits(gbits);
    keys[data.from] = { key: bits, bases };
    socket.emit('verify_bases', { from, recipient: data.from, bases });
});

socket.on('recieve_bases', (data) => {
    const classifiedBases = classifyBases(data.bases, data.from);
    filterUserKey(data.from, classifiedBases);
    socket.emit('classified_bases', { from, recipient: data.from, classifiedBases });
});

socket.on('recieve_classified_bases', ({ from, classifiedBases }) => {
    filterUserKey(from, classifiedBases);
});

const login = () => {
    const username = usernameInput.value;
    socket.emit('login', { username });
    messageDiv.style.display = 'block';
    from = username;
}

const sendMessage = () => {
    const text = messageInput.value;
    const messageElement = document.createElement('li');
    messageElement.innerText = `${from}(you): ${text}`;
    messages.appendChild(messageElement);

    socket.emit('message', { from, recipient, message: rc4(keys[recipient].key, text) });
}

const updateOnlineUsers = (onlineUsers) => {
    onlineUserList.innerHTML = '';
    onlineUsers.forEach((onlineUser) => {
        const onlineUserButton = document.createElement('button');
        onlineUserButton.onclick = () => {
            generateKeyForUser(onlineUser);
            recipient = onlineUser;
        };
        onlineUserButton.innerText = onlineUser;
        onlineUserList.appendChild(onlineUserButton);
    });
}

const generateKeyForUser = (user) => {
    if (keys[user] !== undefined) {
        return;
    }

    keys[user] = { key: (new Array(DIGITS).fill(0).map(() => Math.round(Math.random()))).join('') };
    sendRandomGroubits(user);
}

const sendRandomGroubits = (user) => {
    const userKey = keys[user].key;
    // Bases which are used to encode bits into groubits using
    // write if base at index i is 1 and iwrite if 0.
    const bases = [];
    const gbits = new Array(DIGITS).fill(0).map((_, i) => {
        // Beginning with a classical bit, choose at random to encode
        // it into a groubit using write or iwrite.
        const bit = parseInt(userKey.charAt(i));
        const gbit = new Groubit();
        const base = Math.round(Math.random());
        bases.push(base);
        if (base) {
            gbit.write(bit);
        } else {
            gbit.iwrite(bit);
        }
        return gbit;
    });

    keys[user] = {
        ...keys[user],
        bases: bases.join('')
    };

    socket.emit('groubits', { from, recipient: user, groubits: JSON.stringify(gbits) });
}

const decodeGroubits = (groubits) => {
    // Bases which are used to decode groubits into bits using
    // read if base at index i is 1 and iread if 0.
    const bases = [];
    const bits = groubits.map(groubit => {
        const base = Math.round(Math.random());
        bases.push(base);
        return base ? groubit.read() : groubit.iread();
    }).join('');
    return { bits, bases: bases.join('') };
}

const filterUserKey = (user, classifiedBases) => {
    // Update key for that user to only contain the bits they guessed right.
    keys[user].key = keys[user].key.split('').filter((_, i) => classifiedBases[i]).join('');
}

// Returns an array with element at i being 1 if bases[i] is equal to the bases[i]
// stored for that user.
const classifyBases = (bases, user) => {
    const userBases = keys[user].bases.split('');
    return userBases.map((base, i) => base === bases.charAt(i) ? 1 : 0);
}

// Obtained this algorithm from https://gist.github.com/farhadi/2185197.
const rc4 = (key, str) => {
	var s = [], j = 0, x, res = '';
	for (var i = 0; i < 256; i++) {
		s[i] = i;
	}
	for (i = 0; i < 256; i++) {
		j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
		x = s[i];
		s[i] = s[j];
		s[j] = x;
	}
	i = 0;
	j = 0;
	for (var y = 0; y < str.length; y++) {
		i = (i + 1) % 256;
		j = (j + s[i]) % 256;
		x = s[i];
		s[i] = s[j];
		s[j] = x;
		res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
	}
	return res;
}

window.login = login;
window.sendMessage = sendMessage;
