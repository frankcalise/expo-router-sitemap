#!/usr/bin/env node

import { readdir, stat } from "fs/promises"
import { join, relative } from "path"

const fmtRed = "\x1b[31m"
const fmtReset = "\x1b[0m"
const fmtBold = "\x1b[1m"

const baseDirs = ["app", "src/app"]
let basePath = ""
let pathMap = new Map<string, string[]>()
let collisionsDetected = false

async function findAppDir(baseDirs: string[]) {
  for (const dir of baseDirs) {
    try {
      await stat(dir)
      return dir
    } catch (error) {
      continue
    }
  }
  return ""
}

async function traverseDir(dir: string, baseUrl = "") {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith("_")) {
      continue // Skip files starting with underscore
    }

    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await traverseDir(fullPath, join(baseUrl, entry.name))
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      const urlPath = convertPathToUrl(fullPath)
      if (!pathMap.has(urlPath)) {
        pathMap.set(urlPath, [])
      }
      pathMap.get(urlPath)!.push(fullPath)
    }
  }
}

function convertPathToUrl(filePath: string): string {
  let url = "/" + relative(basePath, filePath)

  // Remove segments within parentheses
  url = url.replace(/\/\([^)]*\)/g, "")

  // Replace index.tsx with /, and remove file extensions
  url = url.replace(/\/index\.tsx$/, "/")
  url = url.replace(/\.(tsx)$/, "")

  return url
}

async function main() {
  basePath = await findAppDir(baseDirs)
  if (!basePath) {
    console.error("Base directory not found")
    return
  }
  await traverseDir(basePath)

  let sortedUrls = Array.from(pathMap.keys()).sort()
  sortedUrls.forEach((url) => {
    const paths = pathMap.get(url)
    if (paths!.length > 1) {
      // Only log if there are collisions
      console.log(url)
      paths!.forEach((path) => console.log(` - ${fmtRed}${fmtBold}${path}${fmtReset}`))
      collisionsDetected = true
    } else {
      console.log(url)
    }
  })

  if (!collisionsDetected) {
    console.log("\n✅ No route collisions detected.")
  } else {
    console.log(`\n${fmtRed}❌${fmtReset} Collisions detected!`)
    process.exit(1)
  }
}

main()
