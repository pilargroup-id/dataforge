# DetailCard - Responsive Mobile Detail Component

Component React yang responsive dan reusable untuk menampilkan detail item dengan layout yang elegan dan mobile-first.

## 📋 Fitur

- ✅ **Fully Responsive** - Optimal untuk mobile, tablet, dan desktop
- ✅ **Props-based Design** - Fleksibel dan mudah dikustomisasi
- ✅ **Lightweight** - Menggunakan React hooks, tanpa dependencies tambahan
- ✅ **Accessible** - ARIA labels dan semantic HTML
- ✅ **Modern UI** - Menggunakan Tailwind CSS dengan design modern
- ✅ **Expandable Content** - Support untuk detail yang bisa disembunyikan
- ✅ **Status Variants** - Support untuk multiple status variants (danger, success, warning, default)

## 🚀 Instalasi

### 1. Copy Component Files
Copy file `DetailCardAdvanced.jsx` ke project Anda:

```bash
cp DetailCardAdvanced.jsx src/components/
```

### 2. Setup Tailwind CSS
Pastikan project Anda sudah menggunakan Tailwind CSS. Jika belum:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 📖 Penggunaan Dasar

### Import Component
```jsx
import DetailCard from './components/DetailCardAdvanced'
```

### Contoh Sederhana
```jsx
<DetailCard
  header={{
    id: 'TCK-252',
    type: 'Software - Lain-lain',
    status: { label: 'Void', variant: 'danger' }
  }}
  title="testing"
  rows={[
    { label: 'Requester', value: 'fatih', variant: 'default' },
    { label: 'Support', value: '-', variant: 'muted' }
  ]}
  metadata={{
    date: '30 Mar 2026',
    time: '13:52 WIB'
  }}
/>
```

## 📝 Props Documentation

### `header` (Object)
Menampilkan informasi header card.

```typescript
header: {
  id: string              // ID atau nomor referensi
  type: string           // Tipe atau kategori
  status?: {
    label: string        // Text status
    variant: string      // 'danger' | 'success' | 'warning' | 'default'
  }
}
```

**Example:**
```jsx
header={{
  id: 'TCK-252',
  type: 'Software - Lain-lain',
  status: { label: 'Void', variant: 'danger' }
}}
```

### `title` (String)
Judul atau nama utama yang ditampilkan di section kedua.

```jsx
title="testing"
```

### `rows` (Array)
Array of row objects yang ditampilkan dalam grid.

```typescript
rows: Array<{
  label: string              // Label/judul field
  value: string | number     // Nilai field
  variant?: string           // 'default' | 'muted'
  icon?: React.ReactNode     // Custom icon (optional)
}>
```

**Example:**
```jsx
rows={[
  { label: 'Requester', value: 'fatih', variant: 'default' },
  { label: 'Support', value: '-', variant: 'muted' },
  { label: 'Priority', value: 'High', variant: 'default' }
]}
```

### `metadata` (Object)
Informasi metadata yang ditampilkan di footer.

```typescript
metadata: {
  date?: string    // Format: "30 Mar 2026"
  time?: string    // Format: "13:52 WIB"
}
```

**Example:**
```jsx
metadata={{
  date: '30 Mar 2026',
  time: '13:52 WIB'
}}
```

### `onEdit` (Function, Optional)
Callback yang dipanggil saat tombol Edit diklik.

```jsx
onEdit={(isEditing) => {
  console.log('Edit mode:', isEditing)
  // Handle edit mode
}}
```

### `actions` (Array, Optional)
Array of action buttons di section content.

```typescript
actions: Array<{
  label: string              // Text button
  onClick: Function          // Click handler
  variant?: string           // 'default' | 'danger' | 'success'
}>
```

**Example:**
```jsx
actions={[
  {
    label: 'Delete',
    onClick: () => alert('Deleted'),
    variant: 'danger'
  },
  {
    label: 'Archive',
    onClick: () => alert('Archived'),
    variant: 'default'
  }
]}
```

### `expandableContent` (JSX | Object, Optional)
Konten yang bisa dikembangkan/disembunyikan.

#### Tipe 1: JSX langsung
```jsx
expandableContent={<div>Konten custom</div>}
```

#### Tipe 2: Object dengan title
```jsx
expandableContent={{
  title: 'Informasi Tambahan',
  content: (
    <div>
      <p><span className="font-semibold">Dibuat:</span> 28 Mar 2026</p>
      <p><span className="font-semibold">Oleh:</span> System Admin</p>
    </div>
  )
}}
```

### `className` (String, Optional)
CSS class tambahan untuk container.

```jsx
className="custom-class"
```

## 🎨 Status Variants

Component mendukung 4 status variants dengan warna berbeda:

| Variant | Warna | Use Case |
|---------|-------|----------|
| `danger` | Red (#EF4444) | Error, Void, Cancel |
| `success` | Green (#22C55E) | Active, Completed, Approved |
| `warning` | Yellow (#EAB308) | Pending, In Progress, Shipped |
| `default` | Blue (#3B82F6) | Normal, Information |

## 💡 Contoh Implementasi

### Contoh 1: Ticket/Issue Tracker
```jsx
<DetailCard
  header={{
    id: 'BUG-1234',
    type: 'Bug Report',
    status: { label: 'Open', variant: 'danger' }
  }}
  title="Login page crashes on mobile"
  rows={[
    { label: 'Reporter', value: 'John Doe', variant: 'default' },
    { label: 'Assignee', value: 'Jane Smith', variant: 'default' }
  ]}
  metadata={{
    date: '1 Apr 2026',
    time: '10:30 WIB'
  }}
  onEdit={(isEditing) => console.log('Editing:', isEditing)}
  actions={[
    {
      label: 'Resolve',
      onClick: () => alert('Marked as resolved'),
      variant: 'success'
    }
  ]}
  expandableContent={{
    title: 'Details',
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-900">Severity</p>
          <p className="mt-1 text-sm">Critical</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900">Steps to Reproduce</p>
          <p className="mt-1 text-sm">1. Open login page on mobile...</p>
        </div>
      </div>
    )
  }}
/>
```

### Contoh 2: User Profile
```jsx
<DetailCard
  header={{
    id: 'USR-001',
    type: 'Administrator',
    status: { label: 'Active', variant: 'success' }
  }}
  title="Fatih Rahman"
  rows={[
    { label: 'Email', value: 'fatih@example.com', variant: 'default' },
    { label: 'Phone', value: '+62 812 3456 7890', variant: 'default' }
  ]}
  metadata={{
    date: '15 Jan 2026',
    time: '09:00 WIB'
  }}
  onEdit={(isEditing) => handleUserEdit(isEditing)}
  expandableContent={{
    title: 'Account Info',
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold">Last Login</p>
          <p className="mt-1 text-sm">30 Mar 2026 13:52 WIB</p>
        </div>
        <div>
          <p className="text-xs font-semibold">2FA Status</p>
          <p className="mt-1 text-sm">✓ Enabled</p>
        </div>
      </div>
    )
  }}
/>
```

### Contoh 3: Order
```jsx
<DetailCard
  header={{
    id: 'ORD-2026-0521',
    type: 'Physical Goods',
    status: { label: 'Shipped', variant: 'warning' }
  }}
  title="Gaming Laptop Bundle"
  rows={[
    { label: 'Customer', value: 'John Doe', variant: 'default' },
    { label: 'Amount', value: 'Rp 25.000.000', variant: 'default' },
    { label: 'Tracking', value: 'SHP123456', variant: 'default' }
  ]}
  metadata={{
    date: '29 Mar 2026',
    time: '14:30 WIB'
  }}
  actions={[
    {
      label: 'Track Package',
      onClick: () => window.open('https://tracking.example.com'),
      variant: 'default'
    },
    {
      label: 'Cancel Order',
      onClick: () => alert('Order cancelled'),
      variant: 'danger'
    }
  ]}
/>
```

## 🎯 Responsive Behavior

Component otomatis responsive pada berbagai ukuran layar:

- **Mobile (< 640px)**: Full width dengan padding minimal
- **Tablet (640px - 1024px)**: Container max-width dengan padding
- **Desktop (> 1024px)**: Centered container dengan spacing optimal

## 🔧 Customization

### Custom Styling
Gunakan prop `className` untuk menambahkan custom styles:

```jsx
<DetailCard
  className="custom-detail-card"
  // ... other props
/>
```

### Custom Icons
Tambahkan custom icons di rows:

```jsx
rows={[
  {
    label: 'Email',
    value: 'user@example.com',
    icon: <MailIcon size={16} className="text-slate-500" />
  }
]}
```

### Dynamic Content
Render konten secara dinamis berdasarkan state:

```jsx
const [data, setData] = useState(initialData)

<DetailCard
  {...data}
  onEdit={(isEditing) => {
    setData({ ...data, isEditing })
  }}
/>
```

## 📦 File Structure

```
outputs/
├── DetailCard.jsx                 # Basic component (contoh sederhana)
├── DetailCardAdvanced.jsx         # Advanced component (props-based)
├── DetailCardExamples.jsx         # Showcase & examples
└── README.md                      # Dokumentasi (file ini)
```

## 🚫 Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile browsers: ✅ All modern browsers

## 📱 Mobile Optimization

Component sudah dioptimalkan untuk mobile dengan:

- Touch-friendly button sizes (min 44x44px)
- Readable font sizes dan line heights
- Proper spacing dan padding
- Optimized images dan icons
- Efficient CSS untuk fast rendering

## ⚡ Performance Tips

1. **Memoize callbacks** jika digunakan di component yang sering re-render:
```jsx
const handleEdit = useCallback((isEditing) => {
  // Handle edit
}, [])

<DetailCard onEdit={handleEdit} />
```

2. **Lazy load expandable content** untuk besar data:
```jsx
expandableContent={{
  title: 'Large Content',
  content: <LazyComponent />
}}
```

3. **Use useMemo** untuk data kompleks:
```jsx
const rows = useMemo(() => computeRows(data), [data])

<DetailCard rows={rows} />
```

## 🤝 Contributing

Untuk menambahkan fitur atau memperbaiki bugs:

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push ke branch
5. Create Pull Request

## 📄 License

MIT License - feel free to use dalam project pribadi atau komersial.

## 📞 Support

Untuk pertanyaan atau issue, silakan buat discussion atau issue di repository.

## 🎓 Learn More

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/)

---

**Happy coding! 🚀**
