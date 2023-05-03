import fs from 'node:fs'
import { Octokit } from '@octokit/action'

const refreshStar = async (file) => {
  const markdown = fs.readFileSync(`./${file}.md`, 'utf-8')
  const lineText = markdown.split('\n')

  const octokit = new Octokit()
  const startTime = new Date()
  console.log('任务开始：', startTime.toLocaleString())
  const getOwnerAndRepoFromUrl = (url) => {
    const [owner, repo] = url.split('/').slice(3)
    return { owner, repo }
  }
  async function queryRepoStarCount(owner, repo) {
    try {
      const { data: { stargazers_count } } = await octokit.request('GET /repos/{owner}/{repo}', {
        owner: owner,
        repo: repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      return stargazers_count
    } catch (error) {
      // console.log(error)
    }
  }
  const extractObject = (line) => {
    const result = /- \[(?<title>[^\]]+)[\]]{1}\((?<path>[^\)]+)[\)]{1} (?<content>[^\n]*)/.exec(line)
    return result?.groups
  }
  const startTask = async () => {
    const allTask = []
    for (let i = 0; i < lineText.length; i++) {
      const line = lineText[i]
      if (line.startsWith('- ')) {
        const resultObj = extractObject(line)
        if (!resultObj) {
          console.warn('无法解析的：', line)
        } else {
          const { title, path, content } = resultObj
          if (!path.startsWith('https://github.com')) {
            console.warn('非github地址：', line)
          } else {
            allTask.push(new Promise(async (resolve) => {
              const { owner, repo } = getOwnerAndRepoFromUrl(path)
              const starCount = await queryRepoStarCount(owner, repo)
              lineText[i] = starCount ? `- [${title}](${path}) ${starCount}⭐️ ${content}` : `- [${title}](${path}) ${content}`
              resolve(true)
            }))
          }
        }
      }
    }
    try {
      const resArr = await Promise.all(allTask)
      const result = lineText.join('\n')
      fs.writeFileSync(`${file}.star.md`, result)
      const endTime = new Date()
      console.log('任务结束：', endTime.toLocaleString())
      console.log('任务耗时：', `${(endTime - startTime) / 1000}s`)
    } catch (e) {
      console.log(e)
    }
  }

  try {
    await startTask()
  } catch (e) {
    console.log('error:', e)
  }
}
const files = ['README', 'README.zh-cn']
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  await refreshStar(file)
}
