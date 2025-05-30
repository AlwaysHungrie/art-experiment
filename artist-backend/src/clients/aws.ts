import aws from 'aws-sdk'
import fs from 'fs'

import crypto from 'crypto'

// cannot exceed 64 characters
const generateFunctionName = (cid: string) => {
  const string = `lambda-${cid}`
  const hash = crypto.createHash('sha256').update(string).digest('hex')
  return hash.slice(0, 64)
}

aws.config.update({
  region: 'ap-south-1',
})

const iam = new aws.IAM()
const lambda = new aws.Lambda()

let roleArn: string | null = null

async function getRoleArn(roleName: string) {
  if (roleArn) return roleArn
  const response = await iam.getRole({ RoleName: roleName }).promise()
  roleArn = response.Role.Arn
  return roleArn
}

export async function createLambdaFunction(cid: string, zipFilePath: string) {
  try {
    const roleName = 'lambda-ex-role'
    const functionName = generateFunctionName(cid)

    const roleArn = await getRoleArn(roleName)

    const zipFileData = fs.readFileSync(zipFilePath)

    const params = {
      FunctionName: functionName,
      Runtime: 'nodejs18.x',
      Role: roleArn,
      Handler: 'index.handler',
      Code: {
        ZipFile: zipFileData,
      },
      Description: `Lambda function for ${cid}`,
      Timeout: 60 * 5, // 5 minutes
      MemorySize: 128,
      Publish: true,
    }

    const result = await lambda.createFunction(params).promise()
    return result.FunctionArn || null
  } catch (error: any) {
    throw error
  }
}

export async function checkLambdaFunction(cid: string) {
  try {
    const response = await lambda
      .getFunction({ FunctionName: generateFunctionName(cid) })
      .promise()

    if (!response.Configuration || !response.Configuration.FunctionArn) {
      return false
    }

    return response.Configuration.FunctionArn
  } catch (error: any) {
    return null
  }
}

export async function invokeLambdaFunction(functionArn: string, payload: any) {
  const response = await lambda
    .invoke({ FunctionName: functionArn, Payload: JSON.stringify(payload) })
    .promise()
  console.log(response)

  const resultJson = JSON.parse(response.Payload as string)
  const body = JSON.parse(resultJson.body as string)

  console.log(body)
  return body
}

export async function deleteLambdaFunction(functionArn: string) {
  try {
    await lambda.deleteFunction({ FunctionName: functionArn }).promise()
  } catch (error: any) {
    throw error
  }
}