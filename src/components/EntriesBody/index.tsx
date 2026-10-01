interface Props {
  data: [string, string][];
}

export const EntriesBody = ({ data }: Props) => {
  return (
    <div className="entries-body">
      {data.map(([label, value]) => {
        return (
          <div className="entries-item leading-[1.7]" key={label + value}>
            <b className="entries-item__label whitespace-nowrap">
              {label}: &nbsp;
            </b>
            <span className="entries-item__value break-all">
              <code>{value}</code>
            </span>
          </div>
        );
      })}
    </div>
  );
};
