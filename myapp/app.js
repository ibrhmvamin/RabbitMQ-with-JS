const express = require("express");
const cors = require("cors");
const amqp = require("amqplib");
const app = express();
const port = 3000;

const RABBITMQ_URI =
  "amqps://dktwyolm:TIIFyepQMiIG9vdqAEetIZs3opuhUYsl@ostrich.lmq.cloudamqp.com/dktwyolm";
const QUEUE_NAME = "mystep-queue";

app.use(cors());

app.use(express.json());

app.post("/send", async (req, res) => {
  const { message } = req.body;
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
    console.log(`Message sent: ${message}`);
    await channel.close();
    await connection.close();
    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send message");
  }
});

app.get("/receive", async (req, res) => {
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const messages = [];
    const consumePromise = new Promise((resolve) => {
      channel.consume(
        QUEUE_NAME,
        (msg) => {
          if (msg !== null) {
            messages.push(msg.content.toString());
            channel.ack(msg);

            if (messages.length === 10) {
              resolve();
            }
          }
        },
        { noAck: false }
      );

      setTimeout(resolve, 500);
    });

    await consumePromise;

    res.status(200).json(messages);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to receive messages");
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
