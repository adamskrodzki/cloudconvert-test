// pages/api/convert.js

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Function to append log to a file
function logToFile(message) {
  const logFilePath = path.resolve('./logs', 'conversion.log');
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;

  // Ensure the logs directory exists
  fs.mkdirSync(path.resolve('./logs'), { recursive: true });

  // Append the log message to the log file
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { apiKey, fileUrl } = req.body;

      if (!apiKey || !fileUrl) {
        const errorMessage = 'API key and file URL are required.';
        logToFile(`Request error: ${errorMessage}`);
        return res.status(400).json({ error: errorMessage });
      }

      logToFile(`Request received: ${JSON.stringify(req.body)}`);

      // Create a job in CloudConvert
      const processResponse = await axios.post(`https://api.cloudconvert.com/v2/jobs`, {
        tasks: {
          'import-my-file': {
            operation: 'import/url',
            url: fileUrl,
          },
          'convert-my-file': {
            operation: 'convert',
            input: 'import-my-file',
            output_format: 'jpg',
            input_format: 'pptx',
          },
          'export-my-file': {
            operation: 'export/url',
            input: 'convert-my-file',
          },
        },
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const jobId = processResponse.data.id;
      logToFile(`Job created: ${jobId}`);

      // Polling the job status to wait until it's finished
      let jobResponse;
      do {
        jobResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second before polling again
      } while (jobResponse.data.status !== 'finished' && jobResponse.data.status !== 'error');

      if (jobResponse.data.status === 'error') {
        throw new Error('Error during conversion process');
      }

      // Collect the output URLs
      const outputUrls = jobResponse.data.tasks
        .filter(task => task.name === 'export-my-file')
        .flatMap(task => task.result.files.map(file => file.url));

      logToFile(`Conversion completed: URLs - ${outputUrls.join(', ')}`);
      return res.status(200).json({ urls: outputUrls });
    } catch (error) {
      logToFile(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    const methodNotAllowedMessage = `Method ${req.method} Not Allowed`;
    logToFile(methodNotAllowedMessage);
    return res.status(405).end(methodNotAllowedMessage);
  }
}
