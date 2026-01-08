# Huffman Coding Visualizer

Step-by-step visualisering af Huffman Coding, herunder opbygning af frekvenstabel, priority queue, Huffman-træ, generering af koder og encoding med kompression.

![Screenshot af Huffman Coding Visualizer](./ffffff.png)

https://jonas-kestenholz.github.io/DSA-eksamen/
---

## Projektet

Dette projekt visualiserer Huffman coding, som er en kendt algoritme til tabsfri datakomprimering.  
Visualiseringen gør det muligt at følge algoritmen, hvordan:

- inputtekst analyseres
- frekvenser for tegn opbygges
- en priority queue anvendes til at bygge Huffman-træet
- binære koder genereres via traversal af træet
- teksten til sidst oversættes til en komprimeret bitstreng

Formålet med projektet er at gøre algoritmens indre mekanismer synlige og lette at forstå.


## Datastrukturer

atastrukturer:

- **Huffman Coding** (grådig algoritme)
- **Map** til frekvenstabel
- **Priority Queue** (implementeret som sorteret array)
- **Binært træ** (Huffman-træ)
- **Depth-First Search (DFS)** til generering af koder
- **Stack** til stepvis traversal uden rekursion



Projektet kræver ingen build tools eller frameworks.

1. Klon repository:
   bash
   git clone https://github.com/Jonas-Kestenholz/DSA-eksamen.git