const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");

const dotenv = require('dotenv')
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: ".env" });
}

const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const api_loginID = process.env.API_ID;
const api_password = process.env.API_PASSWORD;

// const api_token = btoa(`${api_loginID}:${api_password}`);

const api_token = Buffer.from(`${api_loginID}:${api_password}`).toString('base64');

const headers = {
  Authorization: `Basic ${api_token}`,
  "Content-Type": "application/json",
};

const createTask = async (domain,responseURL) => {
  let task_id;
  console.log(responseURL);
  await axios
    .post(
      "https://api.dataforseo.com/v3/on_page/task_post",
      [
        {
          target: domain,
          max_crawl_pages: 1,
          force_sitewide_checks: true,
          start_url: new URL(`https://${responseURL}`),
        },
      ],
      { headers }
    )
    .then((res) => {
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

const taskResponse = [];
app.post("/search", async (req, res) => {
  responseURL = req.body.url;
  const domain = responseURL.replace(/^(https?:\/\/)?(www\.)?/, "");
  let task_id = "";
  let taskFound = false;
  task_id = await createTask(domain,responseURL);
  while(!taskFound){
    taskFound = await isTaskReady(task_id);
    setTimeout(async ()=>{},3000)
  }
  await axios
    .post(`https://api.dataforseo.com/v3/on_page/pages`, [{ id: task_id }], {
      headers,
    })
    .then((page_res) => {
      for (const taskList of page_res.data.tasks[0].result) {
        taskResponse.push(taskList);
      }
    })
    .catch((err) => {
      console.log(err);
    });
  res.json({
    url: taskResponse[0].items[0].url,
    onpage_score: taskResponse[0].items[0].onpage_score,
    internal_links_count: taskResponse[0].items[0].meta.internal_links_count,
    external_links_count: taskResponse[0].items[0].meta.external_links_count,
    images_count: taskResponse[0].items[0].meta.images_count,
    images_size: taskResponse[0].items[0].meta.images_size,
    scripts_count: taskResponse[0].items[0].meta.scripts_count,
    scripts_size: taskResponse[0].items[0].meta.scripts_size,
    plain_text_size: taskResponse[0].items[0].meta.content.plain_text_size,
    plain_text_rate: taskResponse[0].items[0].meta.content.plain_text_rate.toFixed(2),
    plain_text_word_count:
      taskResponse[0].items[0].meta.content.plain_text_word_count.toFixed(2),
    automated_readability_index:
      taskResponse[0].items[0].meta.content.automated_readability_index.toFixed(2),
    coleman_liau_readability_index:
      taskResponse[0].items[0].meta.content.coleman_liau_readability_index.toFixed(2),
    dale_chall_readability_index:
      taskResponse[0].items[0].meta.content.dale_chall_readability_index.toFixed(2),
    flesch_kincaid_readability_index:
      taskResponse[0].items[0].meta.content.flesch_kincaid_readability_index.toFixed(2),
    smog_readability_index:
      taskResponse[0].items[0].meta.content.smog_readability_index.toFixed(2),
    description_to_content_consistency:
      taskResponse[0].items[0].meta.content.description_to_content_consistency.toFixed(2),
    title_to_content_consistency:
      taskResponse[0].items[0].meta.content.title_to_content_consistency.toFixed(2),
    time_to_interactive:
      taskResponse[0].items[0].page_timing.time_to_interactive,
    dom_complete: taskResponse[0].items[0].page_timing.dom_complete,
    largest_contentful_paint:
      taskResponse[0].items[0].page_timing.largest_contentful_paint,
    connection_time: taskResponse[0].items[0].page_timing.connection_time,
    time_to_secure_connection:
      taskResponse[0].items[0].page_timing.time_to_secure_connection,
    waiting_time: taskResponse[0].items[0].page_timing.waiting_time,
    download_time: taskResponse[0].items[0].page_timing.download_time,
    duration_time: taskResponse[0].items[0].page_timing.duration_time,
    duplicate_title: taskResponse[0].items[0].duplicate_title,
    duplicate_description: taskResponse[0].items[0].duplicate_description,
    duplicate_content: taskResponse[0].items[0].duplicate_content,
    size: taskResponse[0].items[0].size >= taskResponse[0].items[0].total_dom_size,
    cache_control: taskResponse[0].items[0].cache_control.cachable,
    seo_friendly_url: taskResponse[0].items[0].seo_friendly_url,
    
  });
});
app.listen(port, (req, res) => {
  console.log(`Server Working on PORT ${port}`);
});
