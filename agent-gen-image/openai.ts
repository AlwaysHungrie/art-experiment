import OpenAI from 'openai'

export const getImageDescription = async (
  openaiApiKey: string,
  mimetype: string,
  base64Image: string
) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Create a prompt that can be used to generate an image depending on your interpretation of the image provided. Keep it short and concise but your interpretation does not have to be literal.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimetype};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'generatePrompt',
          description:
            'Generate a prompt that can be given to an ai so that you can recreate your interpretation of the image. Keep it short and concise but your interpretation does not have to be literal.',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description:
                  'The prompt that can be given to an ai so that you can recreate your interpretation of the image.',
              },
            },
            required: ['prompt'],
          },
        },
      },
    ],
    tool_choice: {
      type: 'function',
      function: { name: 'generatePrompt' },
    },
    temperature: 1.5,
    max_tokens: 300,
  })

  const result = response.choices[0].message
  return result.tool_calls?.[0]?.function.arguments ?? ''
}

export const getImage = async (openaiApiKey: string, prompt: string) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  })

  if (!response.data || response.data.length === 0) {
    throw new Error('No image was generated')
  }

  return response.data[0].url ?? ''
}
