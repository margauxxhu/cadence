import { createFamily } from '../_components/families-actions'

export default function NewFamilyPage() {
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Add family</h1>
      <form action={createFamily} className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Parent name</label>
          <input
            name="parent_name"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parent email</label>
          <input
            name="parent_email"
            type="email"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
        >
          Create family
        </button>
      </form>
    </div>
  )
}
