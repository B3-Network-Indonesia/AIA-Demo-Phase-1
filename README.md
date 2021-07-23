# Call Recording Download Example

## Requirments

Docker <br />
Docker Compose <br />
Azure Blob Storage Account

<hr />

## Generate Key Pair

To create a key pair, see the following repository <a href="https://github.com/B3-Network-Indonesia/Generate-PGP-Key-Pair">Generate Key Pairs</a>.
You will generate `publickey.asc` and `privatekey.asc` files. `publickey.asc` is given to B3 Networks to encrypt files. To decrypt the file, you need a private key and passphrase, copy your `privatekey.asc` to this root folder and copy your passphrase to the `.env` file.

## Setup .env file

You need to setup the .env file before running the application

```
CONNECTION_STRING=<Connection string to azure blob storage account>
CONTAINER_NAME=<Container name of azure blob storage>
SECRET=<API key that provide by B3 Networks>
PASSPHRASE=<passphrase to decrypt privatekey>

```

<hr />

<hr />

## Running Application

### Using Docker Compose

Run this command :

```
docker-compose build

docker-compose up -d
```
