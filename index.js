const express = require('express');
const multer = require('multer');
const mysql = require('mysql');
const path = require('path');
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 3000;

// setup database
const getDatabaseConnection = () => {
	return mysql.createConnection({
		host: process.env.DB_IP,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	});
};

// setup table for storing uploaded files
const createTableIfNotExists = () => {
	const connection = getDatabaseConnection();
	connection.connect();
	connection.query(
		`CREATE TABLE IF NOT EXISTS multer_exercise (
    pic_id INT AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(255), 
    path VARCHAR(255)
  );`
	);
	connection.end();
};

// put data into table
const insertIntoTable = (name, path) => {
	const connection = getDatabaseConnection();
	connection.connect();
	connection.query(`INSERT INTO multer_exercise (name, path) VALUES ('${name}', '${path}')`);
	connection.end();
};

const handleUploadData = (req, res, next) => {
	req.files.forEach((file) => {
		const { originalname, destination } = file;
		insertIntoTable(originalname, destination);
	});
	next(null, req, res);
};

// set storage engine
const uploadProfilePic = multer({
	fileFilter: (req, file, cb) => {
		if (!file) {
			return cb(new Error('No file uploaded'));
		}
		if (file.mimetype.split('/')[0] !== 'image') {
			return cb(new Error('File is not an image'));
		}
		cb(null, true);
	},
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, 'uploads/profile/pic');
		},
		filename: (req, file, cb) => {
			cb(null, file.originalname);
		},
	}),
});

// set index route
app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '/index.html'));
});

// handle profile pic upload
app.post(
	'/upload-profile-pic',
	uploadProfilePic.array('profile_pic'),
	handleUploadData,
	(req, res) => {
		res.send('Profile pic uploaded');
	}
);

// handle profile pic getting
app.get('/get-pics', (req, res) => {
	const connection = getDatabaseConnection();
	connection.connect();
	connection.query(`SELECT * FROM multer_exercise`, (err, rows) => {
		if (err) {
			res.send(err);
		} else {
			res.send(`
				<body>
					<ul>
						${rows.map((row) => `<li><a href=${row.path + '/' + row.name}>${row.name}</a></li>`).join('')}
					</ul>
				</body>
			`);
		}
	});
	connection.end();
});

// show uploaded pics when client requests
app.use('/uploads/profile/pic', express.static('uploads/profile/pic'));

// catch errors
app.use(function (err, req, res, next) {
	res.status(500).send(err.message);
});

// 404 as last route
app.get('*', function (req, res) {
	res.status(404).send('Page not found');
});

// handle table creation
createTableIfNotExists();
// listen on port
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
