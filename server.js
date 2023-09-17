const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");

const dotenv = require("dotenv");
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: ".env" });
}

const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const api_loginID = process.env.API_ID;
const api_password = process.env.API_PASSWORD;

// const api_token = btoa(`${api_loginID}:${api_password}`);

const api_token = Buffer.from(`${api_loginID}:${api_password}`).toString(
  "base64"
);

const headers = {
  Authorization: `Basic ${api_token}`,
  "Content-Type": "application/json",
};

const createTask = async (domain, responseURL) => {
  let task_id;
  console.log(responseURL);
  if (
    !responseURL.startsWith("http://") &&
    !responseURL.startsWith("https://") &&
    !responseURL.startsWith("www.")
  ) {
    responseURL = new URL(`https://www.${responseURL}`);
  }
  await axios
    .post(
      "https://api.dataforseo.com/v3/on_page/task_post",
      [
        {
          target: domain,
          max_crawl_pages: 1,
          force_sitewide_checks: true,
          start_url: responseURL,
        },
      ],
      { headers }
    )
    .then((res) => {
      console.log("Created:", res.data.tasks[0]);
      task_id = res.data.tasks[0].id;
    })
    .catch((err) => {
      console.log(err);
    });
  return task_id;
};

const isTaskReady = async (task_id) => {
  let taskFound = false;
  await axios
    .get("https://api.dataforseo.com/v3/on_page/tasks_ready", { headers })
    .then((res) => {
      if (res.data.tasks[0].result) {
        for (const task of res.data.tasks[0].result) {
          if (task_id === task.id) {
            console.log("Ready:", task);
            taskFound = true;
            break;
          }
        }
      }
    })
    .catch((err) => {
      console.log(err);
    });
  return taskFound;
};

let taskResponse;
let responseURL;
app.get("/:url", async (req, res) => {
  responseURL = decodeURIComponent(req.params.url);
  const domain = responseURL.replace(/^(https?:\/\/)?(www\.)?/, "");
  let task_id = "";
  let taskFound = false;
  task_id = await createTask(domain, responseURL);
  while (!taskFound) {
    taskFound = await isTaskReady(task_id);
    setTimeout(async () => {}, 3000);
  }
  await axios
    .post(`https://api.dataforseo.com/v3/on_page/pages`, [{ id: task_id }], {
      headers,
    })
    .then((page_res) => {
      console.log("Tasks", page_res.data.tasks);
      for (const taskList of page_res.data.tasks[0].result) {
        taskResponse = taskList;
      }
      console.log("Result:", taskResponse);
    })
    .catch((err) => {
      console.log(err);
    });
  try {
    if (taskResponse.items !== null) {
      res.json({
        url: taskResponse.items[0].url,
        onpage_score: taskResponse.items[0].onpage_score,
        internal_links_count: taskResponse.items[0].meta.internal_links_count,
        external_links_count: taskResponse.items[0].meta.external_links_count,
        images_count: taskResponse.items[0].meta.images_count,
        images_size: taskResponse.items[0].meta.images_size,
        scripts_count: taskResponse.items[0].meta.scripts_count,
        scripts_size: taskResponse.items[0].meta.scripts_size,
        plain_text_size: taskResponse.items[0].meta.content.plain_text_size,
        plain_text_rate:
          taskResponse.items[0].meta.content.plain_text_rate.toFixed(2),
        plain_text_word_count:
          taskResponse.items[0].meta.content.plain_text_word_count.toFixed(2),
        automated_readability_index:
          taskResponse.items[0].meta.content.automated_readability_index.toFixed(
            2
          ),
        coleman_liau_readability_index:
          taskResponse.items[0].meta.content.coleman_liau_readability_index.toFixed(
            2
          ),
        dale_chall_readability_index:
          taskResponse.items[0].meta.content.dale_chall_readability_index.toFixed(
            2
          ),
        flesch_kincaid_readability_index:
          taskResponse.items[0].meta.content.flesch_kincaid_readability_index.toFixed(
            2
          ),
        smog_readability_index:
          taskResponse.items[0].meta.content.smog_readability_index.toFixed(2),
        description_to_content_consistency:
          taskResponse.items[0].meta.content.description_to_content_consistency.toFixed(
            2
          ),
        title_to_content_consistency:
          taskResponse.items[0].meta.content.title_to_content_consistency.toFixed(
            2
          ),
        time_to_interactive:
          taskResponse.items[0].page_timing.time_to_interactive,
        dom_complete: taskResponse.items[0].page_timing.dom_complete,
        largest_contentful_paint:
          taskResponse.items[0].page_timing.largest_contentful_paint,
        connection_time: taskResponse.items[0].page_timing.connection_time,
        time_to_secure_connection:
          taskResponse.items[0].page_timing.time_to_secure_connection,
        waiting_time: taskResponse.items[0].page_timing.waiting_time,
        download_time: taskResponse.items[0].page_timing.download_time,
        duration_time: taskResponse.items[0].page_timing.duration_time,
        duplicate_title: taskResponse.items[0].duplicate_title,
        duplicate_description: taskResponse.items[0].duplicate_description,
        duplicate_content: taskResponse.items[0].duplicate_content,
        size:
          taskResponse.items[0].size >= taskResponse.items[0].total_dom_size,
        cache_control: taskResponse.items[0].cache_control.cachable,
        seo_friendly_url: taskResponse.items[0].seo_friendly_url,
      });
    }
    else{
      res.json(null);
    }
  } catch (err) {
    res.json(null);
  }
});
app.listen(port, (req, res) => {
  console.log(`Server Working on PORT ${port}`);
});
