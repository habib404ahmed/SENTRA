import React, { useState } from 'react';
import { Search, Database, Layers, Shield, Activity, Network } from 'lucide-react';
import { FeatureDefinition, FeatureSchemaMetadata } from '../../types';

interface FeatureSchemaExplorerProps {
  schema: FeatureSchemaMetadata | null;
  loading: boolean;
}

export const FeatureSchemaExplorer: React.FC<FeatureSchemaExplorerProps> = ({ schema, loading }) => {
  const [search, setSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('all');

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading SENTRA feature schema definitions...</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <p className="text-sm">Schema definitions currently unavailable.</p>
      </div>
    );
  }

  const scopes = ['all', 'flow', 'behavioral', 'dns', 'tls'];

  const filteredFeatures = schema.features.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.source_field.toLowerCase().includes(search.toLowerCase());
    const matchesScope = selectedScope === 'all' || f.feature_scope === selectedScope;
    return matchesSearch && matchesScope;
  });

  const getScopeBadge = (scope: string) => {
    switch (scope) {
      case 'flow':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Flow-Level
          </span>
        );
      case 'behavioral':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Behavioral Window
          </span>
        );
      case 'dns':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            DNS Metadata
          </span>
        );
      case 'tls':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            TLS Encrypted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {scope}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400 shrink-0" />
              <h3 className="text-base font-semibold text-white">
                Versioned Feature Schema Explorer
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {schema.version}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active mathematical registry of {schema.total_features} unidirectional IP network features configured for ML extraction and anomaly classification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Filter Scope:</span>
            <div className="flex flex-wrap bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
              {scopes.map((scope) => (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  className={`px-2.5 sm:px-3 py-1 text-xs rounded-lg font-medium capitalize transition-all ${
                    selectedScope === scope
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feature by name, description, or source field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Features Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Feature Name</th>
              <th className="py-3 px-3">Scope</th>
              <th className="py-3 px-3">Data Type</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Calculation Method</th>
              <th className="py-3 px-3">Missing Value Policy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredFeatures.map((f) => (
              <tr key={f.name} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-indigo-300">
                  {f.name}
                </td>
                <td className="py-3 px-3">{getScopeBadge(f.feature_scope)}</td>
                <td className="py-3 px-3 font-mono text-slate-400">{f.data_type}</td>
                <td className="py-3 px-4 text-slate-300 max-w-xs">{f.description}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={f.calculation_method}>
                  {f.calculation_method}
                </td>
                <td className="py-3 px-3 text-[11px] text-slate-400 italic">
                  {f.missing_value_behavior}
                </td>
              </tr>
            ))}
            {filteredFeatures.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No features matched the current search or scope filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
