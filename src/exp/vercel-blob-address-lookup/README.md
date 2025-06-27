# Vercel Blob Address Lookup (Comparison Solution)

**Goal:**  
CDN-based address lookup using Vercel Blob storage for performance comparison against FlexSearch solution.

## 🏗️ Architecture

```
User Input → API Request
                ↓
         Vercel Blob CDN
                ↓
        Compressed Address Index
                ↓
         Network-dependent search
         (~700ms average)
```

## 📊 Performance Characteristics

- **Search Speed**: ~700ms average (network dependent)
- **Consistency**: Predictable performance via CDN
- **Cold Start**: No warmup needed - always same speed
- **Scalability**: Good for moderate datasets
- **Cost Model**: Pay per GB storage + bandwidth

## 🧪 Comparison Testing

**Live Demo:** Open `../flexsearch-complete-test.html` in your browser to:

- Compare Vercel Blob vs FlexSearch performance
- See real network timing and consistency
- Test with actual production data

## 📈 Use Cases

**Best for:**

- Small to medium datasets (< 100k entries)
- Applications requiring predictable response times
- Teams already using Vercel infrastructure
- Scenarios where client-side indexing isn't feasible

**Limitations:**

- Network-dependent performance
- Always slow compared to local indexing
- Higher cost at scale
- No progressive enhancement

## 🌐 Infrastructure

- **CDN**: Vercel Blob global distribution
- **Data Format**: Compressed JSON index
- **Access**: Direct HTTPS requests
- **Caching**: Browser and CDN-level caching
