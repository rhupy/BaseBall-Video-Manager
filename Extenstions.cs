using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace BaseBall_Video_Manager
{
    public static class MyExtensions
    {
        public static string ToStr(this string str)
        {
            return str == null ? string.Empty : str;
        }
        public static string ToNodeText(this XmlNode node)
        {
            return node == null ? string.Empty : node.InnerText;
        }
        public static void InitDataTable(this DataTable dt)
        {
            dt = new DataTable();
            //dt.Columns.Add("idx");
            dt.Columns.Add("filename");
            dt.Columns.Add("lasttime");
            dt.Columns.Add("addtime");
            dt.Columns.Add("eval");
            dt.Columns.Add("desc");
            dt.Columns.Add("fullpath");
        }
        public static void AddNewFileData(this DataTable dt, List<string> fileName, string nowTime)
        {
            foreach (string file in fileName)
            {
                DataRow row = dt.NewRow();
                row["filename"] = file;
                row["lasttime"] = "";
                row["addtime"] = nowTime;
                row["eval"] = "";
                row["desc"] = "";
                row["fullpath"] = Path.GetFullPath(file);
                dt.Rows.Add(row);
            }
        }
    }
}
