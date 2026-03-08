import React from "react";

export const LegalSection = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-bold text-[#d4a843] mt-8 mb-2.5 pb-1.5 border-b border-[#2a2a2a] tracking-tight">
    {children}
  </h2>
);

export const LegalSubSection = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-[#f5f5f5] mt-5 mb-1.5">{children}</h3>
);

export const LegalP = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2.5 text-sm text-[#d4d4d4] leading-relaxed">{children}</p>
);

export const LegalStrong = ({ children }: { children: React.ReactNode }) => (
  <strong className="text-[#f5f5f5]">{children}</strong>
);

export const LegalHighlight = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[rgba(37,99,246,0.05)] border-l-[3px] border-[#2563eb] px-4 py-3 my-3.5 rounded-r-md text-[13.5px]">
    {children}
  </div>
);

export const LegalWarn = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[rgba(217,119,6,0.06)] border-l-[3px] border-[#d97706] px-4 py-3 my-3.5 rounded-r-md text-[13.5px]">
    {children}
  </div>
);

export const LegalGreen = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[rgba(5,150,105,0.05)] border-l-[3px] border-[#059669] px-4 py-3 my-3.5 rounded-r-md text-[13.5px]">
    {children}
  </div>
);

export const LegalCompanyBox = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#161616] border border-[#2a2a2a] px-5 py-4 rounded-lg my-4 text-[13px] text-[#999] leading-relaxed">
    {children}
  </div>
);

export const LegalTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto my-3.5">
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              className="px-3 py-2 text-left border border-[#2a2a2a] bg-[#161616] font-semibold text-[#f5f5f5] text-xs uppercase tracking-wide"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-2 text-left border border-[#2a2a2a] text-[#d4d4d4]">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const LegalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-[#d4a843] hover:underline" target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);
