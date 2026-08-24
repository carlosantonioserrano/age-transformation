import { NextResponse } from "next/server"
import Replicate from "replicate"

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: Request) {
  try {
    const { image, ageShift } = await request.json()

    if (!image) {
      return NextResponse.json(
        { success: false, error: "No se recibió ninguna imagen." },
        { status: 400 }
      )
    }

    const apiKey = process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "La REPLICATE_API_KEY no está definida en las variables de entorno de Render." },
        { status: 500 }
      )
    }

    // Modelo de modificación de edad / rostro en Replicate
    // Utiliza un prompt adaptado según el valor de ageShift (positivo = viejo, negativo = joven)
    const prompt = ageShift > 0 
      ? `photo of the same person aged ${Math.min(80, 25 + ageShift)} years old, realistic aging, detailed wrinkles, gray hair`
      : `photo of the same person as a young child aged ${Math.max(5, 25 + ageShift)} years old, smooth skin, young face`

    const output = await replicate.run(
      "timothybrooks/instruct-pix2pix:7800299e4cc530128e08d6d5392231b402830f2f51fa69720b08051e8a8e104e",
      {
        input: {
          image: image,
          prompt: prompt,
          num_inference_steps: 20,
          image_guidance_scale: 1.5,
        },
      }
    )

    // Replicate devuelve un array de URLs o un string
    const resultImageUrl = Array.isArray(output) ? output[0] : output

    return NextResponse.json({
      success: true,
      resultImage: resultImageUrl,
    })
  } catch (error: any) {
    console.error("Error detallado en Replicate API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al procesar la imagen con la IA de Replicate.",
      },
      { status: 500 }
    )
  }
}