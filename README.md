# Call Recording Download Example

## Requirments

NodeJs v12 <br />
Npm v6 or above <br />
Sqlite3 <br />
Azure Blob Storage Account

<hr />

## Setup .env file

You need to setup the .env file before running the application, env file contain

```
CONNECTION_STRING=<Connection string to azure blob storage account>
CONTAINER_NAME=<Container name of azure blob storage>
SECRET=<API key that provide by B3 Networks>
PASSPHRASE=<passphrase to decrypt privatekey>

```

<hr />

## Setup privatekey.asc file

You need to create file name `privatekey.asc` in the root folder, and copy your privatekey to this file

<hr />

## Running Application

### Using Docker Compose

Run this command :

```
docker-compose build

docker-compose up -d
```
